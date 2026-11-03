-- Datos fiscales del profesional (03/11/2026).
--
-- Por qué: Sere pasa a ser una SAS (Responsable Inscripto) y le tiene que
-- facturar su comisión a cada profesional. El tipo de factura depende de la
-- condición del profesional (A si es Responsable Inscripto, B si es
-- monotributista o exento), y para emitirla hace falta su CUIT. Hasta hoy la
-- app no le pedía ninguna de las dos cosas.
--
-- ⚠️ Tabla aparte y NO columnas en `coaches`: la policy de SELECT de `coaches`
-- es `using (true)` (el catálogo es público) y un CUIT ahí quedaría a una
-- columna mal otorgada de ser público. Mismo criterio que
-- `coach_payout_accounts`.
--
-- Opcional: un profesional que vive afuera y solo cobra en dólares puede no
-- tener CUIT. La fila no existe hasta que la carga.

begin;

-- Dígito verificador del CUIT/CUIL (módulo 11). La app hace la misma cuenta
-- (`lib/datosFiscales.ts`) para avisar mientras se escribe; esta es la frontera.
create or replace function public.cuit_valido(c text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  pesos int[] := array[5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  suma int := 0;
  dv int;
begin
  if c is null or c !~ '^[0-9]{11}$' then
    return false;
  end if;
  if substr(c, 1, 2) not in ('20', '23', '24', '27', '30', '33', '34') then
    return false;
  end if;
  for i in 1..10 loop
    suma := suma + substr(c, i, 1)::int * pesos[i];
  end loop;
  dv := 11 - (suma % 11);
  if dv = 11 then dv := 0; end if;
  if dv = 10 then return false; end if;
  return dv = substr(c, 11, 1)::int;
end;
$$;

create table if not exists public.coach_datos_fiscales (
  coach_id    uuid primary key references public.coaches(id) on delete cascade,
  cuit        text not null check (public.cuit_valido(cuit)),
  condicion   text not null check (condicion in ('monotributo', 'responsable_inscripto', 'exento')),
  updated_at  timestamptz not null default now()
);

comment on table public.coach_datos_fiscales is
  'CUIT y condición frente al IVA del profesional, para que Sere le facture su comisión (A o B). Privada: dueño y admins.';

create or replace function public.touch_coach_datos_fiscales()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_coach_datos_fiscales on public.coach_datos_fiscales;
create trigger trg_touch_coach_datos_fiscales
  before update on public.coach_datos_fiscales
  for each row execute function public.touch_coach_datos_fiscales();

alter table public.coach_datos_fiscales enable row level security;
revoke all on public.coach_datos_fiscales from anon, authenticated;
grant select on public.coach_datos_fiscales to authenticated;
grant insert (coach_id, cuit, condicion),
      update (cuit, condicion)
  on public.coach_datos_fiscales to authenticated;

-- El dueño: el profesional cuya fila de `coaches` es suya.
drop policy if exists coach_datos_fiscales_select on public.coach_datos_fiscales;
create policy coach_datos_fiscales_select on public.coach_datos_fiscales
  for select to authenticated using (
    exists (select 1 from public.coaches c where c.id = coach_id and c.profile_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists coach_datos_fiscales_insert on public.coach_datos_fiscales;
create policy coach_datos_fiscales_insert on public.coach_datos_fiscales
  for insert to authenticated with check (
    exists (select 1 from public.coaches c where c.id = coach_id and c.profile_id = auth.uid())
  );

drop policy if exists coach_datos_fiscales_update on public.coach_datos_fiscales;
create policy coach_datos_fiscales_update on public.coach_datos_fiscales
  for update to authenticated
  using (exists (select 1 from public.coaches c where c.id = coach_id and c.profile_id = auth.uid()))
  with check (exists (select 1 from public.coaches c where c.id = coach_id and c.profile_id = auth.uid()));

commit;
