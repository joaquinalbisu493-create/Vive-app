-- Aviso a los admins cuando un reembolso automático se rinde (22/10/2026).
--
-- `mp-process-refunds` y `paypal-process-refunds` reintentan cada 5 minutos y
-- abandonan a los 6 fallos (MAX_ATTEMPTS = 6 en las dos). Hasta hoy eso pasaba
-- en silencio: la reserva quedaba en 'reembolso_pendiente' y nadie se enteraba.
-- Se encontró así un pago de prueba de $1 trabado desde el 09/08. Con un
-- cliente real, es una persona sin su plata y sin que nadie lo sepa.
--
-- Se resuelve en la base y no en las dos funciones, igual que el aviso de
-- problemas de sesión (`tg_session_issue_notify_admins`): el disparador mira el
-- contador, así cubre los dos procesadores y cualquier otro que lo use. El
-- aviso va a `notifications` y `mail-notificaciones` lo manda por mail.
--
-- ⚠️ El 6 está repetido acá a propósito. Si cambia MAX_ATTEMPTS en alguna de
-- las dos funciones, cambiarlo también acá.
--
-- Sin datos de la persona en el aviso: se revisa en sere.ar/admin (Plata).
-- Sin `booking_id`: en la app, una notificación con reserva abre el chat de
-- esa sesión, y el admin no es parte de ella.

begin;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type = any (array[
  'reserva_nueva', 'reserva_confirmada', 'reserva_rechazada', 'reserva_cancelada',
  'recordatorio_sesion', 'invitacion_review', 'recurso_feedback_umbral',
  'propuesta_publicada', 'propuesta_ajustes', 'postulacion_aprobada', 'postulacion_rechazada',
  'credencial_verificada', 'credencial_rechazada', 'recurso_publicado', 'recurso_rechazado',
  'sancion_aplicada', 'sancion_levantada', 'profesional_no_disponible', 'profesional_disponible',
  'profesional_con_horarios', 'cambio_pedido', 'cambio_resuelto',
  'problema_sesion_nuevo', 'problema_sesion_respondido',
  'reembolso_trabado'
]));

create or replace function public.tg_refund_dead_letter_notify_admins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_status = 'reembolso_pendiente'
     and coalesce(old.refund_attempts, 0) < 6
     and coalesce(new.refund_attempts, 0) >= 6 then
    insert into notifications (recipient_id, type, title, body)
    select p.id, 'reembolso_trabado',
           'Un reembolso no se pudo hacer solo',
           'El reembolso automático por ' ||
           case new.payment_provider when 'paypal' then 'PayPal' else 'Mercado Pago' end ||
           ' de ' || coalesce(new.currency, '') || ' ' || coalesce(new.amount::text, '?') ||
           ' falló 6 veces y no se va a volver a intentar (reserva ' || left(new.id::text, 8) ||
           '). Revisalo en sere.ar/admin, pestaña Plata: probablemente haya que devolverlo a mano.'
    from profiles p where p.is_admin;
  end if;
  return new;
exception when others then
  -- Que falle el aviso no puede trabar el registro del intento.
  raise warning 'tg_refund_dead_letter_notify_admins: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.tg_refund_dead_letter_notify_admins() from public, anon, authenticated;

drop trigger if exists trg_refund_dead_letter_notify_admins on public.bookings;
create trigger trg_refund_dead_letter_notify_admins
  after update of refund_attempts on public.bookings
  for each row execute function public.tg_refund_dead_letter_notify_admins();

commit;
