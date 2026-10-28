-- La vista pública de matrículas muestra solo las de profesionales publicados.
--
-- 28/10/2026, auditoría de seguridad (skill security-audit, tanda 6).
-- `coach_credentials_public` corre con los permisos de su dueño (a propósito,
-- scripts/cerrar-escritura-en-vistas.sql) y la puede leer `anon`, pero solo
-- filtraba `status = 'verificada'`. Una matrícula se verifica ANTES de aprobar
-- al profesional, y rechazar o despublicar no la toca: cualquiera sin cuenta
-- podía listar número de matrícula, título e institución de postulantes en
-- revisión, rechazados o despublicados, que 20260924040000 dejó privados.
-- Ahora exige además `coaches.verified`, la misma regla que `coaches`.
-- Verificado antes: 0 casos expuestos hoy.

create or replace view public.coach_credentials_public as
 select c.id, c.coach_id, c.kind, c.title, c.institution, c.year,
        c.registration_number, c.reviewed_at, c.profesion
   from public.coach_credentials c
  where c.status = 'verificada'
    and exists (select 1 from public.coaches co where co.id = c.coach_id and co.verified is true);
