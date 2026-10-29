// Anota un problema para el resumen diario (`resumen-diario`, tabla
// `alertas_del_sistema`). Nunca tira: una alerta que no se pudo guardar no
// puede romper el flujo que la produjo. Necesita un cliente con service role.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function anotarAlerta(admin: SupabaseClient, tipo: string, detalle: Record<string, unknown> = {}): Promise<void> {
  try {
    const { error } = await admin.from('alertas_del_sistema').insert({ tipo, detalle })
    if (error) console.error('[alerta] no se pudo guardar:', tipo, error.message)
  } catch (e) {
    console.error('[alerta] no se pudo guardar:', tipo, (e as Error)?.message ?? e)
  }
}
