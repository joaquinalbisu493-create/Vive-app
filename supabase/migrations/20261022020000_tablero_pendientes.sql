-- Tablero de administración: "Necesita atención" (22/10/2026).
--
-- Una sola llamada que cuenta lo que espera una acción de un admin, para verlo
-- desde sere.ar/admin sin abrir el panel de la app. Solo LEE: las acciones se
-- siguen haciendo en la app (o por `admin-actions`).
--
-- Cada cola usa el MISMO filtro que el panel de la app (`lib/admin.ts` y
-- `admin-actions`), así los dos lugares no pueden mostrar números distintos:
--   postulaciones   coaches.application_status = 'pendiente'
--   identidad       identity_verifications.status = 'pendiente'
--   credenciales    coach_credentials.status = 'pendiente'
--   denuncias       reports.status = 'pendiente'
--   problemas       session_issues.estado <> 'resuelto'   (plazo: 24 h)
--   garantias       guarantee_claims.status = 'pendiente'
--   reembolsos      bookings.payment_status = 'reembolso_pendiente'
--   usdt_reclamos   usdt_claims.estado = 'pendiente'
--   usdt_sueltas    usdt_transfers.estado in ('sin_dueno', 'monto_menor')
--   pagos           bookings no-MP completadas, cobradas y sin paid_out_at
--   sin_cerrar      bookings 'confirmada' cuya sesión terminó hace más de 24 h
--                   (regla crítica 10: sin evidencia de asistencia no se
--                   completan solas y "la levanta el panel")
--
-- ⚠️ A diferencia de `admin_metricas()`, acá NO se descartan las cuentas de
-- prueba: una cola es una cola. Si algo de prueba queda trabado, también
-- aparece en el panel de la app, y conviene verlo igual.

begin;

create or replace function public.admin_pendientes()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  resultado jsonb;
begin
  if not public.is_admin() then
    raise exception 'no_autorizado' using errcode = '42501';
  end if;

  with colas(clave, cantidad, mas_antiguo, vencidos) as (
    select 'postulaciones', count(*), min(created_at), null::bigint
      from public.coaches where application_status = 'pendiente'
    union all
    select 'identidad', count(*), min(enviada_at), null
      from public.identity_verifications where status = 'pendiente'
    union all
    select 'credenciales', count(*), min(created_at), null
      from public.coach_credentials where status = 'pendiente'
    union all
    select 'denuncias', count(*), min(created_at), null
      from public.reports where status = 'pendiente'
    union all
    select 'problemas', count(*), min(created_at),
           count(*) filter (where created_at < now() - interval '24 hours')
      from public.session_issues where estado <> 'resuelto'
    union all
    select 'garantias', count(*), min(requested_at), null
      from public.guarantee_claims where status = 'pendiente'
    union all
    select 'reembolsos', count(*), min(created_at), null
      from public.bookings where payment_status = 'reembolso_pendiente'
    union all
    select 'usdt_reclamos', count(*), min(created_at), null
      from public.usdt_claims where estado = 'pendiente'
    union all
    select 'usdt_sueltas', count(*), min(block_time), null
      from public.usdt_transfers where estado in ('sin_dueno', 'monto_menor')
    union all
    select 'pagos', count(*), min(scheduled_date::timestamptz), null
      from public.bookings
      where payment_provider <> 'mp' and status = 'completada'
        and payment_status = 'aprobado' and paid_out_at is null
    union all
    select 'sin_cerrar', count(*), min(scheduled_date::timestamptz), null
      from public.bookings
      where status = 'confirmada'
        and ((scheduled_date + scheduled_time::time
              + make_interval(mins => coalesce(duration_minutes, 60)))
             at time zone 'America/Argentina/Buenos_Aires') < now() - interval '24 hours'
  )
  select jsonb_object_agg(clave, jsonb_build_object(
           'cantidad', cantidad, 'mas_antiguo', mas_antiguo, 'vencidos', vencidos))
    into resultado
    from colas;

  return resultado;
end;
$$;

revoke all on function public.admin_pendientes() from public, anon;
grant execute on function public.admin_pendientes() to authenticated;

commit;
