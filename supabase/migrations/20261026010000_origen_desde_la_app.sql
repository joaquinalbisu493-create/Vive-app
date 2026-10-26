-- La app marca por dónde entró la reserva (`bookings.origen`).
--
-- 26/10/2026. Los links de sere.ar/c/<slug> abren la app si está instalada, así
-- que la persona que llega por el link de un profesional ahora reserva en la app
-- y no en la web. La primera sesión que viene por el link va al 0% de comisión
-- (D13), y eso cuelga de `origen = 'link'`, que hasta hoy solo escribía
-- `web-book`. Sin esto, abrir la app le cobraba el 20% al profesional justo en
-- los clientes que trajo él.
--
-- Qué cambia:
--   · `authenticated` puede escribir `origen` al insertar (antes, ni la columna).
--   · Un trigger lo acota: desde la app solo vale 'link' o 'app'. Cualquier otra
--     cosa, o nada, queda 'app'. `catalogo` y lo que escriban las funciones con
--     service role no pasan por acá.
--
-- ⚠️ Confiar en el cliente para 'link' es aceptable a propósito: el link de cada
-- profesional es público, así que cualquiera puede abrirlo y reservar por la web
-- con el mismo efecto. Este cambio no abre nada que no estuviera abierto.
--
-- 📌 Las reservas de la app empiezan a quedar 'app' en vez de null. Las viejas
-- siguen en null ("no sabemos"), como decía `scripts/add-booking-origen.sql`.

begin;

grant insert (origen) on public.bookings to authenticated;

create or replace function public.tg_normalizar_origen()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_setting('role', true) = 'authenticated' then
    if new.origen is distinct from 'link' then
      new.origen := 'app';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.tg_normalizar_origen() from public, anon, authenticated;

drop trigger if exists trg_normalizar_origen on public.bookings;
create trigger trg_normalizar_origen
  before insert on public.bookings
  for each row execute function public.tg_normalizar_origen();

commit;
