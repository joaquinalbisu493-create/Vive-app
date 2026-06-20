-- ============================================================
-- Vita — room_url en salas + trigger Jitsi Meet
-- ⚠️  REVISAR CON ANDRE ANTES DE CORRER
-- Fecha: 2026-06-20
--
-- Este script es idempotente: se puede correr aunque ya se
-- haya aplicado parcialmente (usa ADD COLUMN IF NOT EXISTS,
-- CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS).
--
-- Qué hace:
--   1. Agrega columna room_url (text, nullable) a salas
--   2. Crea función trigger que genera una URL Jitsi Meet única
--   3. Registra el trigger BEFORE INSERT ON salas
--   4. Refresca la caché de PostgREST
--
-- NO toca datos existentes. NO modifica bookings ni otras tablas.
-- ============================================================

-- 1. Columna room_url en salas
ALTER TABLE public.salas
  ADD COLUMN IF NOT EXISTS room_url text;

-- 2. Función trigger (CREATE OR REPLACE para idempotencia)
CREATE OR REPLACE FUNCTION public.fn_salas_room_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.room_url := 'https://meet.jit.si/vita-' || encode(gen_random_bytes(8), 'hex');
  RETURN NEW;
END;
$$;

-- 3. Trigger (drop primero para evitar duplicados)
DROP TRIGGER IF EXISTS trg_salas_room_url ON public.salas;
CREATE TRIGGER trg_salas_room_url
  BEFORE INSERT ON public.salas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_salas_room_url();

-- 4. Refrescar caché PostgREST
NOTIFY pgrst, 'reload schema';
