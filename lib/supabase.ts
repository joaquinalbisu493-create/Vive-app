import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Verificación de conexión — remover en producción
supabase.from('profiles').select('count').limit(1).then(({ error }) => {
  if (error) {
    console.log('[Supabase] Error de conexión:', error.message)
  } else {
    console.log('[Supabase] Conexión exitosa ✓')
  }
})

export async function registrarEvento(
  eventName: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  await supabase.from('analytics_events').insert({
    user_id: session?.user?.id ?? null,
    event_name: eventName,
    properties,
  });
}