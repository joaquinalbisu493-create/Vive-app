-- `profiles.email` sigue al mail de la cuenta (`auth.users.email`).
--
-- 28/10/2026. Desde hoy cada persona puede cambiar su mail desde la app
-- (screens/CambiarMailScreen.tsx, con código al mail actual y al nuevo). El
-- trigger de alta (`handle_new_user`) copia el mail una sola vez, y la app no
-- puede escribir `profiles.email` (scripts/lock-privileged-columns.sql), así que
-- sin esto el perfil se quedaba con el mail viejo, y el panel busca las cuentas
-- por ese mail (`admin-actions` → `change_user_email`).

begin;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

revoke all on function public.sync_profile_email() from public, anon, authenticated;

drop trigger if exists trg_sync_profile_email on auth.users;
create trigger trg_sync_profile_email
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function public.sync_profile_email();

commit;
