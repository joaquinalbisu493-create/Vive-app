// resumen-diario — un mail por día a hola@sere.ar con lo que hay que mirar
// (29/10/2026). Lo llama el cron `resumen-diario` (8:00 de Argentina) con el
// service role. Si no hay nada que contar, no manda nada.
//
// Junta: las alertas que anotaron las funciones en las últimas 24 h
// (`alertas_del_sistema`: disputas de PayPal sin leer, contracargos, intentos
// de usar el panel sin permiso, cuentas de MP de otro profesional), los
// reembolsos automáticos trabados (6 intentos fallidos) y las colas del panel
// que llevan más de 2 días esperando.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { esServiceRole } from '../_shared/service-role.ts'
import { enviarMail, nombreSeguro, ultimoErrorDeMail } from '../_shared/email.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PARA = Deno.env.get('ALERTAS_MAIL') ?? 'hola@sere.ar'

const QUE_ES: Record<string, string> = {
  paypal_disputa_sin_leer: 'Disputa de PayPal que no se pudo leer (¿falta el permiso de disputas?). Revisala en PayPal.',
  paypal_reversion_sin_confirmar: 'Aviso de contracargo de PayPal que PayPal no confirmó. Revisar a mano.',
  contracargo: 'Contracargo registrado.',
  panel_sin_permiso: 'Alguien sin permiso de admin intentó usar el panel.',
  admin_sin_factor_habilitado: 'Una cuenta admin intentó operar con un segundo factor no habilitado.',
  mp_cuenta_de_otro_profesional: 'Un profesional intentó conectar una cuenta de Mercado Pago que ya es de otro.',
}

Deno.serve(async (req) => {
  if (!esServiceRole(req.headers.get('Authorization') ?? '', SERVICE_ROLE)) {
    return new Response('no autorizado', { status: 401 })
  }
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const hace2dias = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  const lineas: string[] = []

  const { data: alertas } = await admin.from('alertas_del_sistema')
    .select('tipo, detalle, created_at').gte('created_at', desde).order('created_at')
  const porTipo = new Map<string, { n: number; ejemplo: unknown }>()
  for (const a of alertas ?? []) {
    const x = porTipo.get(a.tipo) ?? { n: 0, ejemplo: a.detalle }
    x.n += 1
    porTipo.set(a.tipo, x)
  }
  for (const [tipo, { n, ejemplo }] of porTipo) {
    lineas.push(`<b>${n} × ${nombreSeguro(QUE_ES[tipo] ?? tipo)}</b><br><span style="color:#87835C">${nombreSeguro(JSON.stringify(ejemplo).slice(0, 200))}</span>`)
  }

  const { count: trabados } = await admin.from('bookings').select('id', { count: 'exact', head: true })
    .eq('payment_status', 'reembolso_pendiente').neq('payment_provider', 'usdt').gte('refund_attempts', 6)
  if (trabados) lineas.push(`<b>${trabados} reembolso(s) automático(s) trabado(s)</b> después de 6 intentos. Hay que devolverlos a mano.`)

  const colas: [string, string, string, string][] = [
    ['usdt_claims', 'estado', 'pendiente', 'reclamo(s) de USDT esperando revisión'],
    ['guarantee_claims', 'status', 'pendiente', 'pedido(s) de garantía esperando revisión'],
    ['reports', 'status', 'pendiente', 'denuncia(s) sin revisar'],
    ['identity_verifications', 'status', 'pendiente', 'identidad(es) por verificar'],
  ]
  for (const [tabla, col, valor, texto] of colas) {
    const fecha = tabla === 'identity_verifications' ? 'enviada_at' : tabla === 'guarantee_claims' ? 'requested_at' : 'created_at'
    const { count } = await admin.from(tabla).select('*', { count: 'exact', head: true }).eq(col, valor).lt(fecha, hace2dias)
    if (count) lineas.push(`${count} ${texto} hace más de 2 días.`)
  }

  if (lineas.length === 0) return new Response(JSON.stringify({ enviado: false }), { status: 200 })

  const hoy = new Date().toISOString().slice(0, 10)
  const ok = await enviarMail({
    para: PARA,
    asunto: `Sere: ${lineas.length} cosa(s) para mirar hoy`,
    titulo: 'Resumen del día',
    lineas,
    pie: 'Lo manda el cron resumen-diario. El detalle está en sere.ar/admin y en los registros de las funciones de Supabase.',
    idempotencyKey: `resumen-diario-${hoy}`,
  })
  return new Response(JSON.stringify({ enviado: ok, puntos: lineas.length, ...(ok ? {} : { error: ultimoErrorDeMail }) }), { status: 200 })
})
