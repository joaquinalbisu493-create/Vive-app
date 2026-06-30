-- ============================================================
-- Vita — Expirar solicitudes pendientes sin respuesta del coach
-- Correr en: Supabase Dashboard → SQL Editor
-- ⚠️  REVISAR CON ANDRE/JOAQUÍN ANTES DE CORRER
-- Fecha: 2026-06-30
--
-- Problema: la tarjeta "Pendientes de respuesta" en
-- CoachReservasScreen.tsx calcula "Xhs para responder" en el cliente
-- (hoursLeftToRespond), pero nunca actualiza bookings.status cuando
-- el plazo de 24hs vence — la solicitud queda en 'pendiente' para
-- siempre y la tarjeta sigue mostrando "0hs para responder".
--
-- Fix: misma idea que complete_confirmed_sessions() (pg_cron cada
-- 5 minutos) — acá, pasar a 'cancelada' cualquier booking 'pendiente'
-- cuyo created_at tenga más de 24hs, y notificar al usuario.
--
-- No manda mensaje a la sala (el rechazo manual del coach tampoco lo
-- hace) ni push notification (requeriría pg_net/Edge Function nueva,
-- fuera de scope de este fix puntual).
-- ============================================================

CREATE OR REPLACE FUNCTION public.expire_pending_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  WITH expired AS (
    UPDATE public.bookings
    SET status = 'cancelada'
    WHERE status = 'pendiente'
      AND created_at < now() - interval '24 hours'
    RETURNING id, user_id, coach_name
  )
  INSERT INTO public.notifications (recipient_id, type, booking_id, title, body)
  SELECT
    user_id,
    'reserva_rechazada',
    id,
    'Sesión no disponible',
    coalesce(coach_name, 'Tu coach') || ' no respondió a tiempo y la solicitud venció. Buscá otro profesional.'
  FROM expired;
END;
$$;

-- Agendar cada 5 minutos, mismo cadence que complete_confirmed_sessions()
SELECT cron.schedule(
  'expire-pending-bookings',
  '*/5 * * * *',
  $$SELECT public.expire_pending_bookings();$$
);

-- Para desagendar si hace falta revertir:
-- SELECT cron.unschedule('expire-pending-bookings');
