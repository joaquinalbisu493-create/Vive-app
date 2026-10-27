-- Dos cierres de la auditoría de seguridad del 27/10/2026 (skill
-- security-audit, corrida 2).
--
-- 1) Reservas que nunca pasaron a pagar ya no tapan la agenda 24 horas.
--    web-book (la reserva desde sere.ar/c) y la app crean la reserva en
--    'pendiente' con payment_status 'no_iniciado'. expire_unpaid_checkouts solo
--    miraba las que ya habían empezado a pagar (preference_id, usdt_amount o
--    PayPal, todas con payment_status 'pendiente'), así que las otras quedaban
--    hasta que expire_pending_bookings las cancelaba a las 24 horas. Como
--    slots_libres cuenta toda reserva 'pendiente' como ocupada, una cuenta
--    gratis podía tapar unos 288 horarios de un profesional en su link público
--    sin pagar nada. Ahora esas se cancelan a los 60 minutos (más margen que
--    los 30 de un checkout abierto: es quien todavía está eligiendo cómo pagar).
--
-- 2) Una sala solo se crea con un profesional verificado del otro lado.
--    La policy de INSERT (definida solo en producción, "Users can create
--    salas") exigía user_id = auth.uid() y nada sobre coach_id: cualquier
--    cuenta podía abrir una conversación vacía con cualquier perfil, que le
--    aparecía en la lista al otro con el nombre y la foto de quien la creó.
--    Además el INSERT de tabla dejaba elegir id y created_at (el orden en la
--    lista). Las 53 salas existentes cumplen la regla nueva (verificado).
--    web-book crea la sala con service role y no pasa por acá.

begin;

create or replace function public.expire_unpaid_checkouts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_booking record;
begin
  for v_booking in
    select id, user_id
    from bookings
    where (
        (payment_status = 'pendiente'
          -- Un cobro iniciado, por cualquiera de los TRES rieles.
          and (
            (preference_id is not null and created_at < now() - interval '30 minutes')
            or
            (usdt_amount is not null and created_at < now() - interval '60 minutes')
            or
            (payment_provider = 'paypal' and created_at < now() - interval '30 minutes')
          ))
        or
        -- Nunca pasó a pagar: si no, tapa el horario en slots_libres 24 horas.
        (payment_status = 'no_iniciado' and status = 'pendiente'
          and preference_id is null and usdt_amount is null
          and created_at < now() - interval '60 minutes')
      )
      -- Solo estados vivos. 'completada' y 'cancelada' quedan afuera a propósito:
      -- no se reescribe historia, esto previene casos nuevos.
      and status in ('pendiente', 'confirmada')
  loop
    update bookings
       set status = 'cancelada'
     where id = v_booking.id;

    insert into notifications (recipient_id, type, booking_id, title, body)
    values (
      v_booking.user_id,
      'reserva_cancelada',
      v_booking.id,
      'Reserva cancelada',
      'No se completó el pago, así que liberamos ese horario. Podés reservarlo de nuevo cuando quieras.'
    );
  end loop;
end;
$function$
;

drop policy if exists "Users can create salas" on public.salas;
create policy "Users can create salas" on public.salas
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and coach_id <> auth.uid()
    and exists (
      select 1 from public.coaches c
      where c.profile_id = salas.coach_id and coalesce(c.verified, false)
    )
  );

revoke insert on public.salas from authenticated;
grant insert (user_id, coach_id) on public.salas to authenticated;

commit;
