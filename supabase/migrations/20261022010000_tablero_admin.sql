-- Tablero de administración (sere.ar/admin), 22/10/2026.
--
-- Tres piezas, todas solo para `is_admin()`:
--   1. `cuentas_internas`: cuentas que NO cuentan en las métricas (pruebas y
--      cuentas propias). Antes del lanzamiento casi todo lo que hay en la base
--      es de prueba: 37 profesionales aprobados y 81 sesiones completadas, y
--      ninguna es real. Sin esta lista el tablero mostraría números inflados.
--   2. `admin_metricas()`: las métricas calculadas en la base, ya filtradas.
--      El tablero solo las lee: nadie carga resultados a mano.
--   3. `objetivos`: los objetivos de cada mes, editables desde el tablero.
--      Un objetivo puede atarse a una métrica (`metrica`) y entonces el avance
--      se completa solo.
--
-- Se descartan solas, sin tener que marcarlas: las cuentas admin, las de la
-- carga de ejemplo (`seed.vive.local`, `vive.app`, `example.com`) y las dadas
-- de baja. El resto se marca a mano desde el tablero (`admin_cuentas()`).
--
-- ⚠️ Supabase otorga por defecto todos los privilegios de una tabla nueva a
-- `anon` y `authenticated` (ver SCHEMA.md, "Permiso sobrante en TODAS las
-- tablas"). Por eso cada tabla arranca con `revoke all` y recién después se
-- otorga lo justo. Y en las funciones, revocar de PUBLIC no alcanza (regla
-- crítica 18): se revoca también de `anon`.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Cuentas internas

create table if not exists public.cuentas_internas (
  profile_id  uuid primary key references public.profiles(id) on delete cascade,
  marcada_por uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

comment on table public.cuentas_internas is
  'Cuentas que no cuentan en las métricas del tablero (pruebas, cuentas propias). Las marca un admin desde sere.ar/admin.';

alter table public.cuentas_internas enable row level security;
revoke all on public.cuentas_internas from anon, authenticated;
-- Insert solo de `profile_id`: quién la marcó lo pone la base.
grant select, delete on public.cuentas_internas to authenticated;
grant insert (profile_id) on public.cuentas_internas to authenticated;

drop policy if exists cuentas_internas_admin_select on public.cuentas_internas;
create policy cuentas_internas_admin_select on public.cuentas_internas
  for select to authenticated using (public.is_admin());
drop policy if exists cuentas_internas_admin_insert on public.cuentas_internas;
create policy cuentas_internas_admin_insert on public.cuentas_internas
  for insert to authenticated with check (public.is_admin());
drop policy if exists cuentas_internas_admin_delete on public.cuentas_internas;
create policy cuentas_internas_admin_delete on public.cuentas_internas
  for delete to authenticated using (public.is_admin());

-- ¿La cuenta se descarta de las métricas? Un solo lugar para la regla, así
-- las métricas y la lista de cuentas no pueden contradecirse.
create or replace function public.es_cuenta_interna(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_id
      and (
        p.is_admin
        or p.deleted_at is not null
        or lower(split_part(p.email, '@', 2)) in ('seed.vive.local', 'vive.app', 'example.com')
        or exists (select 1 from public.cuentas_internas ci where ci.profile_id = p.id)
      )
  );
$$;

revoke all on function public.es_cuenta_interna(uuid) from public, anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Métricas

create or replace function public.admin_metricas()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  inicio_mes date := date_trunc('month', hoy)::date;
  resultado jsonb;
begin
  if not public.is_admin() then
    raise exception 'no_autorizado' using errcode = '42501';
  end if;

  with
  pros as (
    select c.*,
      (c.verified
        and (c.suspendido_hasta is null or c.suspendido_hasta < now())) as aprobado,
      (coalesce(c.mp_connected, false)
        or exists (select 1 from public.coach_payout_accounts a
                   where a.coach_id = c.id
                     and (a.method is not null or coalesce(a.accepts_paypal, false) or coalesce(a.accepts_usdt, false)))) as con_cobro,
      (exists (select 1 from public.coach_weekly_pattern w where w.coach_id = c.id)
        or exists (select 1 from public.coach_availability v
                   where v.coach_id = c.id and v.date >= hoy and not v.blocked)) as con_agenda
    from public.coaches c
    where not public.es_cuenta_interna(c.profile_id)
  ),
  reservas as (
    select b.* from public.bookings b
    join public.coaches c on c.id = b.coach_id
    where not public.es_cuenta_interna(b.user_id)
      and not public.es_cuenta_interna(c.profile_id)
  ),
  pagadas as (
    -- Sesión realizada y cobrada. Las reembolsadas no cuentan.
    select * from reservas
    where status = 'completada' and payment_status = 'aprobado'
  ),
  clientes as (
    select user_id, count(*) as n, min(scheduled_date) as primera from pagadas group by user_id
  )
  select jsonb_build_object(
    'generado', now(),
    'mes', to_char(inicio_mes, 'YYYY-MM'),

    'postulaciones_pendientes', (select count(*) from pros where application_status = 'pendiente'),
    'profesionales_aprobados',  (select count(*) from pros where aprobado),
    'profesionales_activos',    (select count(*) from pros
                                  where aprobado and availability_status = 'activo' and con_cobro and con_agenda),
    'profesionales_sin_cobro',  (select count(*) from pros where aprobado and not con_cobro),
    'profesionales_sin_agenda', (select count(*) from pros where aprobado and not con_agenda),

    'usuarios_registrados', (select count(*) from public.profiles p
                              where p.role = 'user' and not public.es_cuenta_interna(p.id)),
    'usuarios_nuevos_mes',  (select count(*) from public.profiles p
                              where p.role = 'user' and not public.es_cuenta_interna(p.id)
                                and (p.created_at at time zone 'America/Argentina/Buenos_Aires')::date >= inicio_mes),

    'sesiones_proximas',         (select count(*) from reservas where status = 'confirmada' and scheduled_date >= hoy),
    'sesiones_completadas_mes',  (select count(*) from reservas where status = 'completada' and scheduled_date >= inicio_mes),
    'sesiones_completadas_total',(select count(*) from reservas where status = 'completada'),
    'cancelaciones_mes',         (select count(*) from reservas where status = 'cancelada'
                                   and (created_at at time zone 'America/Argentina/Buenos_Aires')::date >= inicio_mes),

    'clientes_primera_sesion_pagada',     (select count(*) from clientes),
    'clientes_primera_sesion_pagada_mes', (select count(*) from clientes where primera >= inicio_mes),
    'clientes_que_volvieron',             (select count(*) from clientes where n >= 2),

    'lista_espera_personas',      (select count(*) from public.lista_de_espera where tipo = 'persona'),
    'lista_espera_profesionales', (select count(*) from public.lista_de_espera where tipo = 'profesional'),

    'cuentas_descartadas', (select count(*) from public.profiles p where public.es_cuenta_interna(p.id))
  ) into resultado;

  return resultado;
end;
$$;

revoke all on function public.admin_metricas() from public, anon;
grant execute on function public.admin_metricas() to authenticated;


-- Las cuentas que SÍ cuentan, más las marcadas a mano, para revisar desde el
-- tablero. Las que se descartan solas no aparecen: no hay nada que decidir.
-- Devuelve el mail porque es lo que permite reconocer una cuenta propia; por
-- eso exige admin igual que el resto.
create or replace function public.admin_cuentas()
returns table (id uuid, nombre text, email text, rol text, creada timestamptz, interna boolean)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'no_autorizado' using errcode = '42501';
  end if;

  return query
    select p.id, p.name, p.email, p.role, p.created_at,
           exists (select 1 from public.cuentas_internas ci where ci.profile_id = p.id)
    from public.profiles p
    where not p.is_admin
      and p.deleted_at is null
      and lower(split_part(p.email, '@', 2)) not in ('seed.vive.local', 'vive.app', 'example.com')
    order by p.created_at desc;
end;
$$;

revoke all on function public.admin_cuentas() from public, anon;
grant execute on function public.admin_cuentas() to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Objetivos del mes

create table if not exists public.objetivos (
  id           uuid primary key default gen_random_uuid(),
  mes          date not null check (extract(day from mes) = 1),
  dueno        text not null check (dueno in ('andre', 'joaquin', 'ambos')),
  tipo         text not null check (tipo in ('esencial', 'entregable', 'resultado')),
  titulo       text not null check (char_length(titulo) between 1 and 200),
  verificacion text check (char_length(verificacion) <= 300),
  -- Meta numérica opcional. Un esencial ("responder en 1 día hábil") no tiene.
  meta         numeric check (meta > 0),
  -- Si está, el avance sale de `admin_metricas()` con esta clave y no de `avance`.
  metrica      text check (metrica in (
                  'profesionales_activos', 'profesionales_aprobados', 'postulaciones_pendientes',
                  'usuarios_registrados', 'usuarios_nuevos_mes',
                  'sesiones_completadas_mes', 'sesiones_completadas_total',
                  'clientes_primera_sesion_pagada', 'clientes_primera_sesion_pagada_mes',
                  'clientes_que_volvieron', 'lista_espera_personas', 'lista_espera_profesionales')),
  avance       numeric check (avance >= 0),
  estado       text not null default 'pendiente'
                 check (estado in ('pendiente', 'en_curso', 'cumplido', 'parcial', 'no_cumplido')),
  nota         text check (char_length(nota) <= 1000),
  creado_por   uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists objetivos_mes_idx on public.objetivos (mes);

comment on table public.objetivos is
  'Objetivos mensuales de los socios, cargados desde sere.ar/admin. Gestión, no vesting: ver docs de la sociedad.';

create or replace function public.touch_objetivos()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.creado_por := old.creado_por;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists trg_touch_objetivos on public.objetivos;
create trigger trg_touch_objetivos before update on public.objetivos
  for each row execute function public.touch_objetivos();

alter table public.objetivos enable row level security;
revoke all on public.objetivos from anon, authenticated;
-- Columnas nombradas: `creado_por` y las fechas las pone la base.
grant select, delete on public.objetivos to authenticated;
grant insert (mes, dueno, tipo, titulo, verificacion, meta, metrica, avance, estado, nota),
      update (mes, dueno, tipo, titulo, verificacion, meta, metrica, avance, estado, nota)
  on public.objetivos to authenticated;

drop policy if exists objetivos_admin_select on public.objetivos;
create policy objetivos_admin_select on public.objetivos
  for select to authenticated using (public.is_admin());
drop policy if exists objetivos_admin_insert on public.objetivos;
create policy objetivos_admin_insert on public.objetivos
  for insert to authenticated with check (public.is_admin());
drop policy if exists objetivos_admin_update on public.objetivos;
create policy objetivos_admin_update on public.objetivos
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists objetivos_admin_delete on public.objetivos;
create policy objetivos_admin_delete on public.objetivos
  for delete to authenticated using (public.is_admin());

commit;
