-- Una propuesta de horario del profesional ya no sirve para cancelar con
-- reembolso completo después de que la sesión empezó.
--
-- 27/10/2026, auditoría de seguridad (skill security-audit, corrida 2). Si el
-- profesional proponía otros horarios y no los retiraba, la propuesta seguía
-- `pendiente` pasado el horario original (vencer_solicitudes_horario solo la
-- vence cuando pasa el horario PROPUESTO). Mientras la reserva seguía
-- `confirmada` (hasta que session-attendance resuelve la asistencia), el cliente
-- podía cancelarla, por UPDATE directo o con rechazar_horarios, y:
--   · guard_booking_security escribía cancelled_by = 'coach' sin mirar la hora;
--   · mark_refund_on_cancel, con 'coach', devolvía todo aunque fuera tardía.
-- O sea: reembolso completo de una sesión ya hecha, anotado al profesional.
-- elegir_horario, responder_reagendado y proponer_horarios ya cortaban con
-- 'ya_empezo'; estas dos no.
--
-- Qué cambia: con una propuesta del profesional pendiente, el cliente no puede
-- cancelar una sesión que ya empezó (ni por UPDATE ni con rechazar_horarios):
-- se rechaza con 'ya_empezo'. Lo que pasó en esa sesión lo resuelve la
-- asistencia (session-attendance), igual que cualquier sesión empezada. No se
-- anota como cancelación del cliente para no quitarle el reembolso si el que
-- faltó fue el profesional. Antes de empezar, todo sigue igual.
--
-- Copias exactas de las definiciones de producción del 27/10/2026 (las de
-- 20260924010000 y 20260924000000), con solo ese cambio. Área de pagos
-- compartida con Codex: anotado en .security-audit-handoff.local.md.

begin;

create or replace function public.guard_booking_security()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  c public.coaches%rowtype;
  actor uuid := auth.uid();
  hhmm text;
  inicio timestamptz;
begin
  select * into c from public.coaches where id=new.coach_id;

  if tg_op='INSERT' then
    if c.id is null or not coalesce(c.verified,false) then
      raise exception 'profesional_no_disponible' using errcode='23514';
    end if;
    if not exists(select 1 from public.salas s where s.id=new.sala_id
       and s.user_id=new.user_id and s.coach_id=c.profile_id) then
      raise exception 'sala_invalida' using errcode='23514';
    end if;
    new.requires_payment := true;
    if current_setting('role',true) = 'authenticated' then
      if new.user_id is distinct from actor then raise exception 'usuario_invalido' using errcode='42501'; end if;
      new.status := 'pendiente';
      new.amount := coalesce(c.price_per_session,c.price_usd);
      new.coach_name := coalesce((select name from public.profiles where id=c.profile_id),'Profesional');
      new.coach_specialty := coalesce(c.specialty,'');
      new.created_at := now();

      -- El horario, contra la agenda del profesional (mismo formato que
      -- bookings_one_confirmed_slot: "9:00" y "09:00" son el mismo turno).
      hhmm := lpad(split_part(new.scheduled_time::text,':',1),2,'0')||':'||
              lpad(split_part(new.scheduled_time::text,':',2),2,'0');
      if new.scheduled_date is null or not exists (
        select 1 from public.coach_availability a
        where a.coach_id=c.id and a.date=new.scheduled_date
          and not coalesce(a.blocked,false)
          and lpad(split_part(a.time,':',1),2,'0')||':'||lpad(split_part(a.time,':',2),2,'0') = hhmm
      ) then
        raise exception 'horario_no_disponible' using errcode='23514';
      end if;
      begin
        inicio := ((new.scheduled_date::text||' '||hhmm)::timestamp) at time zone 'America/Argentina/Buenos_Aires';
      exception when others then
        raise exception 'horario_no_disponible' using errcode='23514';
      end;
      if inicio <= now() then
        raise exception 'horario_no_disponible' using errcode='23514';
      end if;

      new.duration_minutes := (select p.slot_duration_minutes from public.coach_weekly_pattern p
                               where p.coach_id=c.id and p.slot_duration_minutes is not null
                               limit 1);
    end if;
  else
    -- Also covers old pending rows that were created with requires_payment=false.
    new.requires_payment := true;
    if new.status='confirmada' and old.status <> 'confirmada'
       and new.payment_status is distinct from 'aprobado' then
      raise exception 'pago_no_acreditado' using errcode='23514';
    end if;
    if old.status in ('cancelada','completada') and new.status is distinct from old.status then
      raise exception 'reserva_finalizada' using errcode='23514';
    end if;
    if actor is not null then
      if new.status='cancelada' and old.status <> 'cancelada' then
        if actor=old.user_id then
          -- Only server-owned proposals establish professional responsibility.
          -- Never trust cancelled_by supplied by the caller.
          if old.status = 'confirmada' and exists (
            select 1 from public.reschedule_requests r
            where r.booking_id=old.id and r.pedida_por='profesional'
              and r.estado='pendiente'
          ) then
            -- Una propuesta vieja no vale como excusa una vez empezada la sesión.
            if now() >= public.inicio_de_sesion(old.scheduled_date, old.scheduled_time) then
              raise exception 'ya_empezo' using errcode='P0001';
            end if;
            new.cancelled_by := 'coach';
          else new.cancelled_by := 'usuario'; end if;
        elsif actor=c.profile_id then new.cancelled_by := 'coach';
        elsif not public.is_admin() then raise exception 'no_autorizado' using errcode='42501';
        end if;
      else
        new.cancelled_by := old.cancelled_by;
        new.cancelled_late := old.cancelled_late;
      end if;
    end if;
  end if;
  return new;
end $function$
;

create or replace function public.rechazar_horarios(p_booking uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_b   public.bookings%rowtype;
begin
  if v_uid is null then raise exception 'sin sesion' using errcode = '28000'; end if;

  select * into v_b from public.bookings where id = p_booking for update;
  if not found or v_b.user_id is distinct from v_uid then
    raise exception 'no es tu reserva' using errcode = '42501';
  end if;
  if v_b.status <> 'confirmada' then raise exception 'no_confirmada'; end if;
  if now() >= public.inicio_de_sesion(v_b.scheduled_date, v_b.scheduled_time) then
    raise exception 'ya_empezo';
  end if;
  if not exists (
    select 1 from public.reschedule_requests r
    where r.booking_id = v_b.id and r.estado = 'pendiente' and r.pedida_por = 'profesional'
  ) then
    raise exception 'sin_propuestas' using errcode = 'P0001';
  end if;

  -- 🔴 `cancelled_by = 'coach'` y no 'usuario'. No es una etiqueta: es lo que
  -- hace que `mark_refund_on_cancel` devuelva la plata aunque falten menos de
  -- 24hs. Y es la verdad de lo que pasó: el que movió la sesión fue él.
  update public.bookings
     set status = 'cancelada', cancelled_by = 'coach'
   where id = v_b.id;

  -- Close proposals only after the guard has derived responsibility.
  update public.reschedule_requests
     set estado = 'rechazada', resolved_at = now()
   where booking_id = v_b.id and estado = 'pendiente';

  perform public.avisar(
    (select c.profile_id from public.coaches c where c.id = v_b.coach_id),
    'cambio_resuelto', v_b.id,
    'No pudieron con ninguno de tus horarios',
    'La sesión se canceló y la devolución quedó pendiente de procesamiento.');

  return jsonb_build_object('resultado', 'cancelada');
end $function$
;

commit;
