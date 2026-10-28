-- Una cuenta no puede tener más de 3 reservas sin pagar a la vez.
--
-- 28/10/2026, auditoría de seguridad (skill security-audit, tanda 3). El
-- arreglo de la tanda 2 (20261027030000) cancela a los 60 minutos las reservas
-- que nunca pasaron a pagar, pero `slots_libres` cuenta toda reserva
-- 'pendiente' como ocupada y el único límite era el de 12 reservas por hora
-- (`trg_rate_limit`). Una cuenta gratis podía reservar 12 horarios de un
-- profesional, dejarlos vencer y volver a reservarlos cada hora: el link
-- público `/c` los mostraba tomados para siempre, sin que nadie pagara.
--
-- Qué cambia: al crear una reserva sin pagar, si quien reserva ya tiene 3
-- vivas sin pagar (pago sin iniciar o iniciado y sin aprobar), se rechaza con
-- `reservas_sin_pagar`. Vale para la app y para `web-book` (service role): el
-- trigger no mira el rol. Las reservas que nacen pagas (reactivación de un
-- reclamo USDT en admin-actions) no cuentan ni se frenan.
--
-- Una persona real reserva una y paga; 3 deja margen para abandonar un pago y
-- reintentar sin trabarse.

begin;

create or replace function public.tg_tope_reservas_sin_pagar()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_vivas int;
begin
  if new.status is distinct from 'pendiente'
     or coalesce(new.payment_status, 'no_iniciado') not in ('no_iniciado', 'pendiente') then
    return new;
  end if;

  -- Dos reservas simultáneas de la misma cuenta no pueden saltear el conteo.
  perform pg_advisory_xact_lock(hashtextextended('tope_reservas_sin_pagar:' || new.user_id::text, 0));

  select count(*) into v_vivas
    from public.bookings
   where user_id = new.user_id
     and status = 'pendiente'
     and payment_status in ('no_iniciado', 'pendiente');

  if v_vivas >= 3 then
    raise exception 'reservas_sin_pagar' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.tg_tope_reservas_sin_pagar() from public, anon, authenticated;

drop trigger if exists trg_tope_reservas_sin_pagar on public.bookings;
create trigger trg_tope_reservas_sin_pagar
  before insert on public.bookings
  for each row execute function public.tg_tope_reservas_sin_pagar();

commit;
