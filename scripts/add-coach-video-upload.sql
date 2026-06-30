-- ============================================================
-- Vita — Video de perfil real para coaches (subida de archivo)
-- Correr en: Supabase Dashboard → SQL Editor
-- ⚠️  REVISAR CON ANDRE/JOAQUÍN ANTES DE CORRER
-- Fecha: 2026-06-30
--
-- Hasta ahora coaches.application_video_url es solo un link externo
-- (YouTube/Drive) que el coach pega una vez al postularse — nunca se
-- muestra a los usuarios. Esta migración agrega una columna nueva,
-- video_url, para un video real subido como archivo desde el perfil
-- del coach (CoachProfileScreen), reproducible nativamente
-- (expo-video) en el perfil público que ve el usuario
-- (ProfesionalScreen). application_video_url queda intacta — sigue
-- siendo el artefacto de revisión de la postulación, no se mezcla
-- con el video de perfil público porque un link de YouTube no es
-- reproducible en un <VideoView> nativo.
--
-- Convención de path en el bucket: coach-videos/{auth.uid()}/video.mp4
-- (carpeta por usuario, filename fijo). auth.uid() = profiles.id =
-- coaches.profile_id, así que la RLS no necesita join a coaches.
-- Subida siempre con upsert:true → un solo archivo por coach, nunca
-- quedan huérfanos al re-subir.
-- ============================================================

-- 1. Columna nueva
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS video_url text;

-- 2. Bucket de Storage — público (cualquier usuario debe poder
--    reproducir el video sin sesión), 50MB de límite, solo mime
--    types de video.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coach-videos',
  'coach-videos',
  true,
  52428800,  -- 50MB
  ARRAY['video/mp4', 'video/quicktime', 'video/x-m4v']
)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS sobre storage.objects para este bucket
CREATE POLICY "coach_videos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'coach-videos');

CREATE POLICY "coach_videos_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'coach-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "coach_videos_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'coach-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'coach-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "coach_videos_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'coach-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Para revertir si hace falta:
-- DROP POLICY IF EXISTS "coach_videos_public_read" ON storage.objects;
-- DROP POLICY IF EXISTS "coach_videos_owner_insert" ON storage.objects;
-- DROP POLICY IF EXISTS "coach_videos_owner_update" ON storage.objects;
-- DROP POLICY IF EXISTS "coach_videos_owner_delete" ON storage.objects;
-- DELETE FROM storage.buckets WHERE id = 'coach-videos';
-- ALTER TABLE public.coaches DROP COLUMN IF EXISTS video_url;
