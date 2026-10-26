// El link de un profesional (`sere.ar/c/<slug>`) abierto en la app.
//
// Desde el 26/10/2026 los links de sere.ar/c/ abren la app si está instalada
// (universal links: `ios.associatedDomains` en app.json y
// `web/.well-known/apple-app-site-association`). Expo Router trae la ruta acá.
//
// Hace dos cosas y se va: anota que la persona llegó por el link de ESE
// profesional (para el 0% de comisión de la primera sesión, ver
// `lib/llegadaPorLink.ts`) y abre su perfil. Sin cuenta, la anotación queda en
// el teléfono y la persona sigue al alta; la reserva de después igual cuenta.

import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppBg } from '@/components/ui/AppBg';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { anotarLlegadaPorLink } from '@/lib/llegadaPorLink';

export default function LinkDelProfesional() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    let vivo = true;
    void (async () => {
      const limpio = String(slug ?? '').trim();
      // Mismos filtros que la página pública: aprobado y con ese slug.
      const { data } = limpio
        ? await supabase.from('coaches').select('id, profile_id').eq('slug', limpio).eq('verified', true).maybeSingle()
        : { data: null };
      if (data?.id) await anotarLlegadaPorLink(data.id);
      if (!vivo) return;
      if (!user) { router.replace('/'); return; }
      if (data?.profile_id) router.replace({ pathname: '/profesional', params: { profileId: data.profile_id } });
      else router.replace('/(tabs)');
    })();
    return () => { vivo = false; };
  }, [slug, user, loading, router]);

  return (
    <AppBg>
      <View style={s.centro}><ActivityIndicator color="#565E32" /></View>
    </AppBg>
  );
}

const s = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
