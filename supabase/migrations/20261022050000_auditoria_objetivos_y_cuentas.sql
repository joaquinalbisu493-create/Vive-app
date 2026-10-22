-- Registro de cambios de objetivos y de cuentas de prueba (22/10/2026).
--
-- Hallazgo 3 de la auditoría del tablero: `objetivos` y `cuentas_internas` se
-- escriben directo desde sere.ar/admin (con RLS `is_admin()`), así que no
-- pasan por `admin-actions` y no quedaban en `admin_audit_log`. `updated_at`
-- dice cuándo, no quién ni qué. Y marcar una cuenta como de prueba cambia los
-- números del negocio: tiene que quedar quién lo hizo.
--
-- Se registra con un trigger en la misma transacción que el cambio: si el
-- registro falla, el cambio tampoco se hace (al revés que `admin-actions`,
-- donde la auditoría va después). Para cambios de gestión hechos a mano desde
-- el tablero, preferimos eso a un cambio sin rastro.
--
-- `admin_audit_log` sigue sin permisos de escritura para el cliente: escribe
-- la función, que es security definer.

begin;

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
begin
  select u.email into mail from auth.users u where u.id = actor;

  if tg_table_name = 'objetivos' then
    tipo := 'objetivo';
    objetivo := coalesce(new.id, old.id);
    if tg_op = 'INSERT' then
      accion := 'objetivo_creado';
      detalle := jsonb_build_object('titulo', new.titulo, 'mes', new.mes, 'dueno', new.dueno, 'tipo', new.tipo, 'meta', new.meta);
    elsif tg_op = 'DELETE' then
      accion := 'objetivo_borrado';
      detalle := jsonb_build_object('titulo', old.titulo, 'mes', old.mes, 'dueno', old.dueno, 'estado', old.estado, 'avance', old.avance);
    else
      accion := 'objetivo_editado';
      -- Solo lo que cambió, con el antes y el después.
      for campo in select unnest(array['mes','dueno','tipo','titulo','verificacion','meta','metrica','avance','estado','nota']) loop
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

drop trigger if exists trg_auditar_objetivos on public.objetivos;
create trigger trg_auditar_objetivos
  after insert or update or delete on public.objetivos
  for each row execute function public.tg_auditar_tablero();

drop trigger if exists trg_auditar_cuentas_internas on public.cuentas_internas;
create trigger trg_auditar_cuentas_internas
  after insert or delete on public.cuentas_internas
  for each row execute function public.tg_auditar_tablero();

commit;
