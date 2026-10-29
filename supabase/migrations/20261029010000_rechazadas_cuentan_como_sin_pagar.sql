-- Las reservas con el pago RECHAZADO también cuentan como "sin pagar".
--
-- 29/10/2026, auditoría de seguridad (tanda 8, revalidación). El tope de 3
-- (20261028010000) y el vencimiento de 60 minutos (20261027030000) miraban solo
-- payment_status 'no_iniciado' y 'pendiente'. Cuando Mercado Pago rechaza un
-- pago, mp-webhook deja la reserva 'pendiente' con payment_status 'rechazado'
-- (a propósito: se puede reintentar), y esa fila no contaba para el tope ni
-- vencía a la hora, pero seguía tapando el horario en slots_libres 24 horas.
-- Con una tarjeta que MP rechaza, una cuenta volvía a tapar la agenda pública.

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
        or
        -- Pago rechazado y no reintentado (29/10/2026): antes quedaba tapando
        -- el horario hasta las 24 h de expire_pending_bookings.
        (payment_status = 'rechazado' and status = 'pendiente'
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

create or replace function public.tg_tope_reservas_sin_pagar()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_vivas int;
begin
  if new.status is distinct from 'pendiente'
     or coalesce(new.payment_status, 'no_iniciado') not in ('no_iniciado', 'pendiente', 'rechazado') then
    return new;
  end if;

  -- Dos reservas simultáneas de la misma cuenta no pueden saltear el conteo.
  perform pg_advisory_xact_lock(hashtextextended('tope_reservas_sin_pagar:' || new.user_id::text, 0));

  select count(*) into v_vivas
    from public.bookings
   where user_id = new.user_id
     and status = 'pendiente'
     and payment_status in ('no_iniciado', 'pendiente', 'rechazado');

  if v_vivas >= 3 then
    raise exception 'reservas_sin_pagar' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

commit;
