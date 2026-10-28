-- Cada parte de una reserva deja de leer los datos de pago privados de la otra.
--
-- 28/10/2026, auditoría de seguridad (skill security-audit, tanda 6). En
-- `bookings` la privacidad era solo por fila: `authenticated` tenía SELECT de
-- todas las columnas, y tanto la policy del cliente como la del profesional
-- devuelven la fila entera. Así:
--   · el cliente leía `payout_reference`: el hash de la transferencia con la
--     que se le pagó al profesional, que en USDT lleva a su billetera privada
--     (la que `coach_payout_accounts` guarda solo para él y el admin);
--   · el profesional leía `refund_address` / `refund_tx_id` (la billetera del
--     cliente), `payer_fingerprint` (la señal anti-fuga, que además une cuentas
--     que pagan con la misma de MP) y dónde estaba el cliente al reservar.
--
-- Qué cambia: esas columnas salen del SELECT de `authenticated` (y `anon` no
-- lee nada de `bookings`: sus policies piden sesión). Los datos de reintegro
-- los lee su dueño, o un admin, con `datos_de_reintegro(ids)`. Las columnas se
-- siguen escribiendo igual (los grants de INSERT/UPDATE no cambian).

begin;

revoke select on public.bookings from anon, authenticated;

grant select (
  amount, cancelled_by, cancelled_late, charged_amount, checkout_attempt_id,
  checkout_lock_until, coach_id, coach_name, coach_specialty, created_at,
  currency, dispute_outcome, dispute_reason, dispute_resolved_at, disputed_at,
  duration_minutes, id, meeting_url, movida_tarde, origen, paid_at,
  paid_effects_claim_id, paid_effects_completed_at, paid_effects_lock_until,
  paid_out_at, payment_id, payment_provider, payment_status, platform_fee_pct,
  preference_id, referral_discount, refund_attempts, refunded_at,
  requires_payment, room_url, sala_id, scheduled_date, scheduled_time, status,
  tema_origen, usdt_amount, user_id, user_message
) on public.bookings to authenticated;

create or replace function public.datos_de_reintegro(p_ids uuid[])
returns table (id uuid, refund_address text, refund_network text, refund_tx_id text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.id, b.refund_address, b.refund_network, b.refund_tx_id
    from public.bookings b
   where b.id = any(p_ids)
     and (b.user_id = auth.uid() or public.is_admin())
   limit 200;
$$;

revoke all on function public.datos_de_reintegro(uuid[]) from public, anon;
grant execute on function public.datos_de_reintegro(uuid[]) to authenticated;

commit;
