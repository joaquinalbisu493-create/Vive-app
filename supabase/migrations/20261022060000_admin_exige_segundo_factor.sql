-- Ser admin exige una sesión con segundo factor (22/10/2026).
--
-- Decisión de Andre, a partir de la auditoría del tablero: el código por mail
-- solo no alcanza para operar como admin. Quien entre al mail de un admin
-- podría pedir un código y entrar. Desde acá, `is_admin()` devuelve true solo
-- si además la sesión es `aal2` (verificó un código de una app de
-- autenticación). `admin-actions` y `guarantee-claim` piden lo mismo
-- (`_shared/aal.ts`).
--
-- Efecto sobre todo lo que usa `is_admin()` (17 políticas de lectura del panel,
-- las RPC del tablero, `continuidad_resumen`, `pares_que_dejaron_de_reservar`,
-- `are_blocked` y `guard_booking_security`): un admin con sesión `aal1` queda
-- con los permisos de cualquier persona. Ninguna de esas usa `is_admin()` para
-- QUITAR algo, solo para dar de más, así que nada del uso normal se rompe.
--
-- ⚠️ Consecuencia aceptada por Andre: Administración en la app (el respaldo)
-- deja de funcionar hasta que la app sepa pedir el segundo factor. Usar la app
-- como persona normal no cambia.
--
-- Si un admin pierde el teléfono: borrar su factor desde el SQL del proyecto
-- (`delete from auth.mfa_factors where user_id = '<id>'`) y vuelve a
-- registrarlo al entrar a sere.ar/admin.

begin;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  ) and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

commit;
