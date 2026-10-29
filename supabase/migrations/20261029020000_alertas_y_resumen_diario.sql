-- Alertas del sistema y resumen diario por mail (29/10/2026).
--
-- Los problemas graves (una disputa de PayPal que no se pudo leer, un
-- contracargo, alguien intentando operar el panel sin permiso, una cuenta de MP
-- que ya era de otro profesional) quedaban solo en los registros de las
-- funciones, que nadie mira. Ahora las funciones los anotan acá y
-- `resumen-diario` (cron, 8:00 de Argentina) manda un mail a hola@sere.ar con
-- lo del último día, más los reembolsos trabados y las colas vencidas. Si no
-- hay nada que contar, no manda nada.
--
-- Solo la escriben y la leen las funciones con service role: sin grants para
-- la app ni para la web.

begin;

create table if not exists public.alertas_del_sistema (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  tipo       text not null check (char_length(tipo) between 1 and 60),
  detalle    jsonb not null default '{}'::jsonb
);

create index if not exists alertas_del_sistema_created_idx on public.alertas_del_sistema (created_at);

alter table public.alertas_del_sistema enable row level security;
revoke all on public.alertas_del_sistema from anon, authenticated;

-- Se guarda 90 días.
select cron.unschedule('purge-alertas') where exists (select 1 from cron.job where jobname = 'purge-alertas');
select cron.schedule('purge-alertas', '47 6 * * *',
  $$ delete from public.alertas_del_sistema where created_at < now() - interval '90 days' $$);

select cron.unschedule('resumen-diario') where exists (select 1 from cron.job where jobname = 'resumen-diario');
select cron.schedule('resumen-diario', '0 11 * * *', $$
  select net.http_post(
    url     := 'https://ggygiihhnkjrerpinhha.supabase.co/functions/v1/resumen-diario',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
      )
    ),
    body    := '{}'::jsonb
  );
$$);

commit;
