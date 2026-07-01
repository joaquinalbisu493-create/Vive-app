-- RLS para saved_resources
-- Ejecutar en el SQL Editor de Supabase Dashboard

ALTER TABLE public.saved_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_resources_select_own" ON public.saved_resources;
DROP POLICY IF EXISTS "saved_resources_insert_own" ON public.saved_resources;
DROP POLICY IF EXISTS "saved_resources_delete_own" ON public.saved_resources;
DROP POLICY IF EXISTS "saved_resources_update_own" ON public.saved_resources;

CREATE POLICY "saved_resources_select_own"
  ON public.saved_resources FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "saved_resources_insert_own"
  ON public.saved_resources FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_resources_delete_own"
  ON public.saved_resources FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "saved_resources_update_own"
  ON public.saved_resources FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
