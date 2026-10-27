-- La billetera de reembolso la escribe solo el cliente que pagó.
--
-- 27/10/2026, auditoría de seguridad (skill security-audit, corrida 1). Un
-- profesional podía escribir `refund_address` / `refund_network` en sus propias
-- reservas canceladas, y con eso desviar a su billetera el reembolso USDT del
-- cliente:
--   · las dos columnas están en el GRANT UPDATE de `authenticated`
--     (scripts/harden-bookings-update.sql, scripts/add-usdt-refunds.sql);
--   · `coaches_can_update_own_bookings` acepta cualquier fila suya con
--     status 'cancelada', sin mirar qué columnas cambian;
--   · las policies permisivas se suman con OR, así que
--     `users_set_own_refund_address` (user_id = auth.uid()) no lo frena;
--   · `guard_booking_security` no revisa esas columnas.
-- Si el profesional la cargaba primero, al cliente ni siquiera se le pedía la
-- suya (SessionsScreen solo pregunta cuando está vacía) y el admin pagaba a la
-- dirección guardada.
--
-- Qué cambia: un trigger aparte rechaza el cambio de esas dos columnas cuando
-- quien escribe desde la app (`authenticated`) no es el cliente de la reserva.
-- Las funciones con service role (admin-actions) no pasan por acá. No se toca
-- `guard_booking_security` ni las policies, para no pisar el trabajo de pagos.

begin;

create or replace function public.tg_reembolso_solo_cliente()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_setting('role', true) = 'authenticated'
     and (new.refund_address is distinct from old.refund_address
          or new.refund_network is distinct from old.refund_network)
     and old.user_id is distinct from auth.uid() then
    raise exception 'reembolso_solo_cliente' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.tg_reembolso_solo_cliente() from public, anon, authenticated;

drop trigger if exists trg_reembolso_solo_cliente on public.bookings;
create trigger trg_reembolso_solo_cliente
  before update of refund_address, refund_network on public.bookings
  for each row execute function public.tg_reembolso_solo_cliente();

commit;
