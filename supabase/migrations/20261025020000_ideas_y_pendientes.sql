-- Pendientes e ideas de los socios, en sere.ar/admin (25/10/2026).
--
-- Pedido de Andre: una pestaña para anotar lo que queda por hacer y las ideas
-- que todavía no se decidieron, en el mismo lugar que el resto de la gestión.
-- Hasta hoy eso vivía en CHANGELOG_SESIONES.md y en las charlas, donde Joaquín
-- no lo ve.
--
-- Mismo molde que `objetivos`: solo admins (RLS `is_admin()`, que pide
-- segundo factor), columnas nombradas, `creado_por` y fechas las pone la base,
-- y cada cambio queda en `admin_audit_log` con el trigger del tablero.
--
-- ⚠️ Lo que se anota acá lo ven todos los admins. Lo que es solo de Andre (por
-- ejemplo, la propuesta 2 de objetivos) no va acá.

begin;

create table if not exists public.ideas (
  id          uuid primary key default gen_random_uuid(),
  -- pendiente: algo decidido que hay que hacer. idea: algo para pensar.
  tipo        text not null default 'pendiente' check (tipo in ('pendiente', 'idea')),
  titulo      text not null check (char_length(titulo) between 1 and 200),
  detalle     text check (char_length(detalle) <= 2000),
  dueno       text check (dueno in ('andre', 'joaquin', 'ambos')),
  prioridad   text not null default 'media' check (prioridad in ('alta', 'media', 'baja')),
  estado      text not null default 'abierta' check (estado in ('abierta', 'hecha', 'descartada')),
  creado_por  uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.ideas is
  'Pendientes e ideas de los socios, cargados desde sere.ar/admin. Los ven todos los admins.';

-- Reusa `touch_objetivos()`: hace exactamente lo mismo (fecha de cambio, y
-- autor y alta inmutables) y no mira columnas propias de objetivos.
drop trigger if exists trg_touch_ideas on public.ideas;
create trigger trg_touch_ideas before update on public.ideas
  for each row execute function public.touch_objetivos();

alter table public.ideas enable row level security;
revoke all on public.ideas from anon, authenticated;
grant select, delete on public.ideas to authenticated;
grant insert (tipo, titulo, detalle, dueno, prioridad, estado),
      update (tipo, titulo, detalle, dueno, prioridad, estado)
  on public.ideas to authenticated;

drop policy if exists ideas_admin_select on public.ideas;
create policy ideas_admin_select on public.ideas
  for select to authenticated using (public.is_admin());
drop policy if exists ideas_admin_insert on public.ideas;
create policy ideas_admin_insert on public.ideas
  for insert to authenticated with check (public.is_admin());
drop policy if exists ideas_admin_update on public.ideas;
create policy ideas_admin_update on public.ideas
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists ideas_admin_delete on public.ideas;
create policy ideas_admin_delete on public.ideas
  for delete to authenticated using (public.is_admin());

-- Lo que estaba abierto al 25/10, para no arrancar en blanco. Se carga ANTES
-- de crear el trigger de auditoría: lo cargó Claude a pedido de Andre, y el
-- registro lo atribuiría a nadie.
insert into public.ideas (tipo, titulo, detalle, dueno, prioridad) values
  ('pendiente', 'Joaquín: registrar la app de autenticación en sere.ar/admin',
   'Y decidir cuál de sus dos cuentas (joaquinalbisu493 o joaquinalbisu494) sigue siendo admin; a la otra se le saca el permiso.', 'joaquin', 'alta'),
  ('pendiente', 'Cargar los objetivos del mes',
   'Después de la llamada del 31/10 y 1/11.', 'ambos', 'alta'),
  ('pendiente', 'Borrar los datos de prueba antes de lanzar',
   'Una sola vez, justo antes del lanzamiento y con un respaldo previo: reservas, pagos, chats y reseñas de prueba. Antes no, porque se siguen haciendo pruebas.', 'andre', 'media'),
  ('pendiente', 'Que Administración en la app pida el segundo factor',
   'Desde el 25/10 no funciona: la base exige segundo factor y la app todavía no lo pide. Va en la próxima versión. Mientras tanto, todo se hace desde sere.ar/admin.', 'andre', 'baja'),
  ('idea', 'Lista de sesiones sin cerrar, con ficha de caso',
   'Hoy "Necesita atención" las cuenta pero no hay dónde verlas ni resolverlas desde el tablero.', null, 'media'),
  ('idea', 'Separar en las listas lo que es de prueba de lo que es real',
   'Una marca visible y un filtro, sin esconder obligaciones de plata reales.', null, 'baja'),
  ('idea', 'Permisos por área', 'Para cuando haya más personas: consulta, profesionales, moderación y plata por separado.', null, 'baja'),
  ('idea', 'Segunda aprobación para pagos grandes', 'Que un pago por encima de un monto lo tenga que confirmar otra persona.', null, 'baja'),
  ('idea', 'Buscador de personas y casos', 'Con una ficha por persona (pagos, sesiones, reclamos) y casos asignados a alguien.', null, 'baja');

-- El trigger de auditoría del tablero suma `ideas`.
create or replace function public.tg_auditar_tablero()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  mail text;
  accion text;
  objetivo uuid;
  tipo text;
  detalle jsonb := '{}'::jsonb;
  campo text;
  campos text[];
begin
  select u.email into mail from auth.users u where u.id = actor;

  if tg_table_name in ('objetivos', 'ideas') then
    if tg_table_name = 'objetivos' then
      tipo := 'objetivo';
      campos := array['mes','dueno','tipo','titulo','verificacion','meta','metrica','avance','estado','nota'];
    else
      tipo := 'idea';
      campos := array['tipo','titulo','detalle','dueno','prioridad','estado'];
    end if;
    objetivo := coalesce(new.id, old.id);
    if tg_op = 'INSERT' then
      accion := tipo || '_creado';
      if tipo = 'objetivo' then
        detalle := jsonb_build_object('titulo', new.titulo, 'mes', new.mes, 'dueno', new.dueno, 'tipo', new.tipo, 'meta', new.meta);
      else
        detalle := jsonb_build_object('titulo', new.titulo, 'tipo', new.tipo, 'dueno', new.dueno, 'prioridad', new.prioridad);
      end if;
    elsif tg_op = 'DELETE' then
      accion := tipo || '_borrado';
      detalle := jsonb_build_object('titulo', old.titulo, 'estado', old.estado);
      if tipo = 'objetivo' then
        detalle := detalle || jsonb_build_object('mes', old.mes, 'dueno', old.dueno, 'avance', old.avance);
      end if;
    else
      accion := tipo || '_editado';
      -- Solo lo que cambió, con el antes y el después.
      foreach campo in array campos loop
        if (to_jsonb(old) -> campo) is distinct from (to_jsonb(new) -> campo) then
          detalle := detalle || jsonb_build_object(campo, jsonb_build_array(to_jsonb(old) -> campo, to_jsonb(new) -> campo));
        end if;
      end loop;
      if detalle = '{}'::jsonb then return new; end if;
      detalle := jsonb_build_object('titulo', new.titulo) || detalle;
    end if;
  else
    tipo := 'profile';
    objetivo := coalesce(new.profile_id, old.profile_id);
    accion := case tg_op when 'INSERT' then 'cuenta_marcada_prueba' else 'cuenta_desmarcada_prueba' end;
    detalle := jsonb_build_object('nombre', (select p.name from profiles p where p.id = objetivo));
  end if;

  insert into admin_audit_log (admin_id, admin_email, action, target_type, target_id, details)
  values (actor, mail, accion, tipo, objetivo, detalle);

  return coalesce(new, old);
end;
$$;

revoke all on function public.tg_auditar_tablero() from public, anon, authenticated;

drop trigger if exists trg_auditar_ideas on public.ideas;
create trigger trg_auditar_ideas
  after insert or update or delete on public.ideas
  for each row execute function public.tg_auditar_tablero();

commit;
