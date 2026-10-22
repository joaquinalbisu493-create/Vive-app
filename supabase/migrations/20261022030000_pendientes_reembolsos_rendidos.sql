-- "Necesita atención": marcar los reembolsos automáticos que se rindieron
-- (22/10/2026).
--
-- `mp-process-refunds` y `paypal-process-refunds` dejan de intentar a los 6
-- fallos (MAX_ATTEMPTS) y la reserva queda en 'reembolso_pendiente' sin avisar
-- a nadie. Se encontró así un pago de prueba de $1 trabado desde agosto. Ahora
-- la cola 'reembolsos' cuenta en `vencidos` los que ya no se van a hacer solos.
-- El resto de la función queda igual que en 20261022020000.

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
    select 'reembolsos', count(*), min(created_at),
           count(*) filter (where payment_provider <> 'usdt' and coalesce(refund_attempts, 0) >= 6)
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
