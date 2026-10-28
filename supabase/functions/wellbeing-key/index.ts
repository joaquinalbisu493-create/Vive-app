// wellbeing-key — le entrega a cada persona la clave con la que su teléfono
// cifra el diario y la gratitud antes de subirlos (05/10/2026).
//
// 🔴 QUÉ PROTEGE Y QUÉ NO. Va primero porque define qué se puede prometer.
//
// El texto del diario y de la gratitud viaja y se guarda cifrado: en la base
// queda ilegible. Un volcado de la tabla, un backup filtrado, un error en una
// policy o alguien mirando la tabla en el panel de Supabase no ven nada.
//
// NO es cifrado de extremo a extremo. Quien tenga a la vez la base Y el secreto
// maestro de esta función puede recalcular la clave de cualquiera. Es una
// decisión de Andre (opción "B"), no un descuido: así el diario sobrevive a un
// teléfono robado o cambiado, y Sere puede seguir cumpliendo un pedido de
// acceso a los datos (Ley 25.326, art. 14). Por eso la Política §8.2 dice
// "cifrado" y sigue diciendo "no de extremo a extremo".
//
// 📝 CÓMO. No se guarda ninguna clave en ningún lado: se CALCULA cada vez como
// HMAC-SHA256(secreto maestro, etiqueta + id de la persona). Mismo secreto y
// misma persona dan siempre la misma clave; personas distintas, claves
// distintas. No hay tabla de claves que filtrar ni que mantener.
//
// 🔴 `WELLBEING_MASTER_KEY` NO SE ROTA NI SE PIERDE. Cambiarla o perderla deja
// ilegibles TODOS los diarios para siempre: no hay forma de recuperarlos. Tiene
// que existir una copia fuera de Supabase (los secrets no se pueden volver a
// leer desde el panel ni desde el CLI). Si algún día hay que rotarla, va con una
// versión nueva de la etiqueta y del prefijo `vd1.` del cliente, manteniendo la
// vieja para leer lo ya escrito.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { WEB_ORIGIN } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// Sin fallback, a propósito: una clave por defecto versionada en el repo sería
// una clave pública. Mismo criterio que `lib/encryption.ts`.
const MASTER = Deno.env.get('WELLBEING_MASTER_KEY') ?? ''

// ⚠️ Esta etiqueta es parte de la clave. Cambiar una letra equivale a cambiar el
// secreto maestro. `scripts/decodificar-export.mjs` usa la misma.
const ETIQUETA = 'vita:bienestar:v1:'
// Notas de sesión: otra etiqueta, así la clave de un par nunca coincide con la
// del diario de nadie. También es parte de la clave: no cambiarla.
const ETIQUETA_NOTAS = 'sere:notas:v1:'

const cors = {
  'Access-Control-Allow-Origin': WEB_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    // La respuesta ES la clave: que no quede en ningún caché intermedio.
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

function base64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'falta el token' }, 401)

  // Identidad real. NUNCA se toma el user_id del body: sería entregarle a
  // cualquiera la clave del diario de otro.
  const asCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await asCaller.auth.getUser()
  if (!user) return json({ error: 'token inválido' }, 401)

  // Falla cerrado: sin secreto (o con uno corto) no se inventa una clave débil.
  if (MASTER.length < 32) {
    console.error('[wellbeing-key] falta WELLBEING_MASTER_KEY o es demasiado corta')
    return json({ error: 'configuración incompleta' }, 500)
  }

  const enc = new TextEncoder()
  const hmacKey = await crypto.subtle.importKey(
    'raw', enc.encode(MASTER), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )

  // Notas de sesión (28/10/2026): clave del PAR cliente-profesional, para que
  // las puedan abrir los dos (la compartida) y nadie más. Mismo modelo que el
  // diario: protege contra quien lea la base, no es E2E. Se entrega solo a una
  // de las dos personas y solo si hay al menos una reserva entre ellas.
  // `coach_id` es el profile id del profesional (como en `session_notes`).
  let body: { par?: { user_id?: unknown; coach_id?: unknown } } = {}
  try { body = await req.json() } catch { /* sin body: clave del diario */ }
  if (body?.par) {
    const clienteId = typeof body.par.user_id === 'string' ? body.par.user_id : ''
    const coachId = typeof body.par.coach_id === 'string' ? body.par.coach_id : ''
    if (!clienteId || !coachId || (user.id !== clienteId && user.id !== coachId)) {
      return json({ error: 'no autorizado' }, 403)
    }
    const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: coach } = await admin.from('coaches').select('id').eq('profile_id', coachId).maybeSingle()
    const { data: reserva } = coach
      ? await admin.from('bookings').select('id').eq('user_id', clienteId).eq('coach_id', coach.id).limit(1)
      : { data: null }
    if (!reserva?.length) return json({ error: 'no autorizado' }, 403)
    const macPar = await crypto.subtle.sign('HMAC', hmacKey, enc.encode(ETIQUETA_NOTAS + clienteId + ':' + coachId))
    return json({ v: 1, key: base64(new Uint8Array(macPar)) })
  }

  const mac = await crypto.subtle.sign('HMAC', hmacKey, enc.encode(ETIQUETA + user.id))

  // `uid`: para que la app no guarde esta clave a nombre de otra cuenta si
  // cambió de sesión mientras la pedía.
  return json({ v: 1, key: base64(new Uint8Array(mac)), uid: user.id })
})
