-- Una cuenta de Mercado Pago cobra para un solo profesional.
--
-- 28/10/2026, auditoría de seguridad (skill security-audit, tanda 4).
-- `coach_mp_accounts.mp_user_id` no era único. Con dos profesionales en la
-- misma cuenta de MP, `mp-webhook` (resolveCoachToken, maybeSingle por
-- mp_user_id) no encuentra a quién pertenece el pago, cae al token de la
-- plataforma, que no puede leer pagos del marketplace, y ningún pago de los dos
-- se acredita: las reservas vencen con la plata adentro de MP. Y el OAuth podía
-- dejar la cuenta de un profesional conectada a otro. mp-oauth-callback ahora
-- lo rechaza con un mensaje; el índice lo garantiza.
--
-- Verificado antes de crear: 1 fila y ningún mp_user_id repetido.

create unique index if not exists coach_mp_accounts_mp_user_id_key
  on public.coach_mp_accounts (mp_user_id);
