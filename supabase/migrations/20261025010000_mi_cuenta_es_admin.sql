-- ¿La cuenta con la que entré es de administración? (25/10/2026)
--
-- sere.ar/admin lo pregunta después del código por mail, para decidir si
-- muestra el paso del segundo factor. Antes leía `profiles.is_admin` directo,
-- pero esa columna no tiene permiso de lectura para el cliente (a propósito,
-- igual que de escritura), así que la lectura fallaba y a Andre le decía
-- "Esa cuenta no es de administración".
--
-- No sirve `is_admin()`: desde `20261022060000` pide además sesión `aal2`, y
-- en este punto la sesión todavía es `aal1`. Esta función solo dice si la
-- PROPIA cuenta tiene la marca; no da ningún permiso (todo lo que protege
-- sigue usando `is_admin()`).

begin;

create or replace function public.mi_cuenta_es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

revoke all on function public.mi_cuenta_es_admin() from public;
revoke all on function public.mi_cuenta_es_admin() from anon;
grant execute on function public.mi_cuenta_es_admin() to authenticated;

commit;
