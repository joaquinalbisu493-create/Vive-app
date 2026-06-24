import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL      = 'https://ggygiihhnkjrerpinhha.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdneWdpaWhobmtqcmVycGluaGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mjc5NjEsImV4cCI6MjA5NzEwMzk2MX0.lHPjyKjJIYD_lUTCF7uMBCKj9tCK_67OyrIFkCLQ-BI';

// Web usa localStorage (con guard SSR); mobile usa AsyncStorage.
const webStorage = {
  getItem: (key: string) =>
    typeof window !== 'undefined' ? window.localStorage.getItem(key) : null,
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  },
};
const authStorage = Platform.OS === 'web' ? webStorage : AsyncStorage;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

/**
 * Garantiza que haya una sesión activa. Si no hay ninguna, inicia sesión
 * anónima. Devuelve el user_id de la sesión actual.
 * Requiere que "Anonymous sign-ins" esté habilitado en:
 * Supabase dashboard → Authentication → Providers → Anonymous.
 */
export async function ensureAnonSession(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;

  // Intentar sesión anónima
  const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously();
  if (!anonErr && anonData.user?.id) return anonData.user.id;

  // Fallback para desarrollo (rate limit o anon deshabilitado temporalmente)
  const { data: devData, error: devErr } = await supabase.auth.signInWithPassword({
    email: 'test_vita_diag@example.com',
    password: 'TestPass123!',
  });
  if (!devErr && devData.user?.id) return devData.user.id;

  throw new Error('No se pudo iniciar sesión. Revisá tu conexión e intentá de nuevo.');
}

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
