-- Facturas de la comisión de Sere a cada profesional (03/11/2026).
--
-- Pedido de Andre: la SAS le factura a cada profesional una vez por mes, y la
-- factura la hace él a mano en ARCA (Comprobantes en línea). El tablero le
-- arma cada factura con los números listos y acá queda anotada la que ya hizo:
-- con su número de comprobante, el detalle de qué reservas cubre (para saber
-- cuándo un reembolso posterior pide nota de crédito) y quién la cargó.
--
-- Esta tabla NO emite nada ante ARCA: es el registro de lo que se emitió.
-- Si algún día se emite desde la app (web service de ARCA), se escribe acá
-- mismo.
--
-- Solo admins (RLS `is_admin()`, que pide segundo factor). Cada alta o baja
-- queda en `admin_audit_log`.

begin;

create table if not exists public.facturas_comision (
  id               uuid primary key default gen_random_uuid(),
  coach_id         uuid not null references public.coaches(id) on delete restrict,
  -- Mes facturado, día 1.
  periodo          date not null check (extract(day from periodo) = 1),
  moneda           text not null check (moneda in ('ARS', 'USD')),
  comprobante      text not null check (comprobante in ('factura', 'nota_credito')),
  letra            text not null check (letra in ('A', 'B')),
  -- Copia de los datos fiscales al momento de facturar: si el profesional los
  -- cambia después, la factura emitida no cambia.
  cuit             text not null check (public.cuit_valido(cuit)),
  condicion        text not null check (condicion in ('monotributo', 'responsable_inscripto', 'exento')),
  neto             numeric(14, 2) not null check (neto > 0),
  iva              numeric(14, 2) not null check (iva >= 0),
  total            numeric(14, 2) not null check (total > 0 and total = neto + iva),
  punto_venta      int not null check (punto_venta between 1 and 99999),
  numero           int not null check (numero between 1 and 99999999),
  fecha            date not null,
  -- Las reservas que cubre (factura) o que anula (nota de crédito).
  booking_ids      uuid[] not null check (cardinality(booking_ids) > 0),
  -- La factura que anula una nota de crédito.
  factura_id       uuid references public.facturas_comision(id) on delete restrict,
  creado_por       uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  check ((comprobante = 'nota_credito') = (factura_id is not null)),
  unique (punto_venta, letra, comprobante, numero)
);

-- Una sola factura por profesional, mes y moneda: el error que más importa
-- evitar es facturarle dos veces lo mismo.
create unique index if not exists facturas_comision_una_por_mes
  on public.facturas_comision (coach_id, periodo, moneda)
  where comprobante = 'factura';

comment on table public.facturas_comision is
  'Facturas y notas de crédito de la comisión de Sere a cada profesional, emitidas a mano en ARCA y anotadas desde sere.ar/admin.';

alter table public.facturas_comision enable row level security;
revoke all on public.facturas_comision from anon, authenticated;
grant select, delete on public.facturas_comision to authenticated;
grant insert (coach_id, periodo, moneda, comprobante, letra, cuit, condicion, neto, iva, total,
              punto_venta, numero, fecha, booking_ids, factura_id)
  on public.facturas_comision to authenticated;

drop policy if exists facturas_comision_admin_select on public.facturas_comision;
create policy facturas_comision_admin_select on public.facturas_comision
  for select to authenticated using (public.is_admin());
drop policy if exists facturas_comision_admin_insert on public.facturas_comision;
create policy facturas_comision_admin_insert on public.facturas_comision
  for insert to authenticated with check (public.is_admin());
-- Borrar es "me equivoqué al anotarla", no anular una factura (eso es una nota
-- de crédito en ARCA). Queda en el registro con todos sus datos.
drop policy if exists facturas_comision_admin_delete on public.facturas_comision;
create policy facturas_comision_admin_delete on public.facturas_comision
  for delete to authenticated using (public.is_admin());

create or replace function public.tg_auditar_facturas_comision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  mail text;
  f public.facturas_comision;
begin
  select u.email into mail from auth.users u where u.id = actor;
  f := case when tg_op = 'DELETE' then old else new end;
  insert into admin_audit_log (admin_id, admin_email, action, target_type, target_id, details)
  values (
    actor, mail,
    case when tg_op = 'DELETE' then 'factura_desanotada' else 'factura_anotada' end,
    'factura', f.id,
    jsonb_build_object(
      'comprobante', f.comprobante, 'letra', f.letra,
      'numero', lpad(f.punto_venta::text, 5, '0') || '-' || lpad(f.numero::text, 8, '0'),
      'coach_id', f.coach_id, 'periodo', f.periodo, 'moneda', f.moneda,
      'neto', f.neto, 'iva', f.iva, 'total', f.total, 'reservas', cardinality(f.booking_ids)
    )
  );
  return null;
end;
$$;

revoke all on function public.tg_auditar_facturas_comision() from public, anon, authenticated;

drop trigger if exists trg_auditar_facturas_comision on public.facturas_comision;
create trigger trg_auditar_facturas_comision
  after insert or delete on public.facturas_comision
  for each row execute function public.tg_auditar_facturas_comision();

commit;
