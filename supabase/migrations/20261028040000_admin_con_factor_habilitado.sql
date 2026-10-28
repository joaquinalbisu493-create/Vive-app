-- Ser admin exige el segundo factor HABILITADO para esa cuenta (28/10/2026).
--
-- Auditoría de seguridad (skill security-audit, tanda 5). Desde 20261022060000
-- `is_admin()` pedía una sesión `aal2`, pero el PRIMER factor se registra desde
-- una sesión que solo pasó por el código del mail (aal1): quien entrara al mail
-- de un admin sin factor podía registrar el suyo, verificarlo y quedar admin.
-- Una cuenta de admin estaba en ese estado el 28/10, y la receta de "perdí el
-- teléfono" (borrar el factor) volvía a dejar a cualquier admin así.
--
-- Qué cambia: `profiles.admin_factor_id` guarda el factor con el que esa cuenta
-- opera como admin, y `is_admin()` exige que la sesión haya subido a aal2 con
-- ESE factor (`auth.sessions.factor_id`). Registrar un factor nuevo ya no da
-- nada hasta que alguien lo habilite por SQL, después de confirmar con la
-- persona por otro medio:
--
--   update public.profiles set admin_factor_id = '<id de auth.mfa_factors>'
--    where id = '<id de la cuenta>';
--
-- La app no puede escribir esta columna (sin grant para authenticated).
-- `admin-actions` y `guarantee-claim` preguntan lo mismo llamando a
-- `is_admin()` con el token de quien llama.

begin;

alter table public.profiles add column if not exists admin_factor_id uuid;
revoke update (admin_factor_id), insert (admin_factor_id) on public.profiles from authenticated, anon;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (
       select 1
         from public.profiles p
         join auth.sessions s
           on s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
          and s.user_id = p.id
          and s.factor_id = p.admin_factor_id
         join auth.mfa_factors f
           on f.id = p.admin_factor_id
          and f.user_id = p.id
          and f.status = 'verified'
        where p.id = auth.uid()
          and p.is_admin
     );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- Se habilitan los factores que ya usan los admins activos (verificados y con
-- sesiones aal2 hechas con ellos). Una cuenta admin sin factor queda sin
-- poderes de admin hasta que se le habilite uno.
update public.profiles p
   set admin_factor_id = f.id
  from auth.mfa_factors f
 where f.user_id = p.id
   and p.is_admin
   and f.status = 'verified'
   and f.factor_type = 'totp'
   and p.admin_factor_id is null
   and (select count(*) from auth.mfa_factors g
         where g.user_id = p.id and g.status = 'verified' and g.factor_type = 'totp') = 1;

commit;
