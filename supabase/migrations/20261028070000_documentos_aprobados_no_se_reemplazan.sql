-- El DNI, la selfie y la matrícula aprobados no se pueden reemplazar ni borrar.
--
-- 28/10/2026, auditoría de seguridad (skill security-audit, tanda 6, mejora).
-- Las policies de Storage dejaban al dueño pisar (upsert) o borrar sus archivos
-- en cualquier momento, también después de que el equipo los aprobó: lo que se
-- revisó no quedaba fijo, y un profesional podía cambiar la foto de la
-- matrícula ya verificada por otra cosa.
--
-- Qué cambia: UPDATE y DELETE siguen limitados a la carpeta propia, y además
--   · identity-docs: no si la identidad de esa cuenta ya está 'verificada';
--   · coach-credentials: no si ese archivo es el de una credencial 'verificada'.
-- Subir archivos nuevos (INSERT) no cambia: una credencial nueva tiene nombre
-- nuevo, y la identidad rechazada se puede volver a mandar.

begin;

drop policy if exists identity_docs_update on storage.objects;
create policy identity_docs_update on storage.objects for update to authenticated
  using (
    bucket_id = 'identity-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (select 1 from public.identity_verifications iv
                     where iv.profile_id = auth.uid() and iv.status = 'verificada')
  );

drop policy if exists identity_docs_delete on storage.objects;
create policy identity_docs_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'identity-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (select 1 from public.identity_verifications iv
                     where iv.profile_id = auth.uid() and iv.status = 'verificada')
  );

drop policy if exists coach_credentials_update on storage.objects;
create policy coach_credentials_update on storage.objects for update to authenticated
  using (
    bucket_id = 'coach-credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (select 1 from public.coach_credentials cc
                     where cc.file_path = storage.objects.name and cc.status = 'verificada')
  );

drop policy if exists coach_credentials_delete on storage.objects;
create policy coach_credentials_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'coach-credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (select 1 from public.coach_credentials cc
                     where cc.file_path = storage.objects.name and cc.status = 'verificada')
  );

commit;
