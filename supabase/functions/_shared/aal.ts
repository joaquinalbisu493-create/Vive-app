// ¿La sesión de quien llama pasó por el segundo factor? (22/10/2026)
//
// Las acciones de admin exigen `aal2`: la sesión tiene que haber verificado un
// código de una app de autenticación, además del código por mail. Así, quien
// entre al mail de un admin no alcanza para operar el panel.
//
// 🔴 Esto se llama DESPUÉS de `auth.getUser()`, que es lo que valida la firma
// del token contra Supabase. Acá solo se lee el claim `aal` de un token que ya
// se sabe auténtico; leerlo antes de validar sería confiar en lo que mande el
// cliente.
//
// Es la contraparte de `public.is_admin()` en la base, que pide lo mismo con
// `auth.jwt()->>'aal'`.

/** El nivel de la sesión (`aal1` o `aal2`), o null si no se puede leer. */
export function nivelDeSesion(authHeader: string): string | null {
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const partes = token.split('.')
  if (partes.length !== 3) return null
  try {
    const b64 = partes[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)))
    return typeof payload.aal === 'string' ? payload.aal : null
  } catch {
    return null
  }
}

export function tieneSegundoFactor(authHeader: string): boolean {
  return nivelDeSesion(authHeader) === 'aal2'
}
