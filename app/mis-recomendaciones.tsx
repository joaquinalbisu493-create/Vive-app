import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ViveFonts, ViveColors, resourceFormatGradient } from '@/constants/theme';
import { ScaleCard } from '@/components/ScaleCard';
import { AppBg } from '@/components/ui/AppBg';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { useAuth } from '@/context/AuthContext';
import { supabase, registrarEvento } from '@/lib/supabase';

const FOREST_SOFT = '#566245';
const TERRACOTTA = '#C06B4A';
const CARD = '#F7F2E7';

const FORMAT_COLOR: Record<string, string> = { audio: '#C06B4A', podcast: '#7E8CA8', video: '#8A6FA8', lectura: '#6B7A56' };
const FORMAT_ICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  audio: 'mic-outline', podcast: 'musical-notes-outline', video: 'videocam-outline', lectura: 'book-outline',
};

function fmtDuration(secs: number | null): string {
  if (!secs) return '';
  const m = Math.ceil(secs / 60);
  return m < 60 ? `${m} min` : `${Math.round(m / 60)}h`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function displayTitle(title: string): string {
  return title.replace(/^\[SEED\]\s*/, '');
}

type Reco = {
  id: string;
  resource_id: string;
  note: string | null;
  opened_at: string | null;
  created_at: string;
  coach_resources: { id: string; title: string; format: string; duration_seconds: number | null };
  coaches: { profiles: { name: string; avatar_url: string | null } };
};

export default function MisRecomendacionesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [recos, setRecos] = useState<Reco[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) { setRecos([]); setLoading(false); return; }
    supabase
      .from('resource_recommendations')
      .select('id, resource_id, note, opened_at, created_at, coach_resources!inner(id, title, format, duration_seconds), coaches!inner(profiles!inner(name, avatar_url))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setRecos((data as any) ?? []); setLoading(false); });
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openReco(item: Reco) {
    const diasDesdeEnvio = Math.round((Date.now() - new Date(item.created_at).getTime()) / 86400000);
    registrarEvento('recomendacion_abierta', {
      formato: item.coach_resources.format,
      dias_desde_envio: diasDesdeEnvio,
    });
    if (!item.opened_at) {
      // Optimista + en segundo plano, SIN await: navegar no puede esperar el
      // round-trip a Supabase (São Paulo). Con la app usada de lejos (Australia),
      // ese await antes de abrir el recurso se sentía como una transición lenta.
      // Marcar es fire-and-forget: si falla, el recurso ya se abrió y el aviso
      // reaparece —que es lo correcto, porque no quedó marcada—.
      const now = new Date().toISOString();
      setRecos(prev => prev.map(r => r.id === item.id ? { ...r, opened_at: now } : r));
      supabase.from('resource_recommendations')
        .update({ opened_at: now }).eq('id', item.id).is('opened_at', null)
        .then(({ error }) => { if (error) console.warn('[reco] no se pudo marcar abierta:', error.message); });
    }
    router.push({
      pathname: '/coach-recurso',
      params: { id: item.resource_id, note: item.note ?? '', fromCoachName: item.coaches?.profiles?.name ?? '' },
    } as any);
  }

  return (
    <AppBg>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#565E32" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Recomendado por tu profesional</Text>
          <View style={s.headerSpacer} />
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={ViveColors.primary} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
            {recos.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="chatbubble-outline" size={38} color="rgba(135,131,92,0.45)" />
                <Text style={s.emptyText}>Todavía no tenés recomendaciones</Text>
              </View>
            ) : (
              recos.map(item => {
                const res = item.coach_resources;
                const color = FORMAT_COLOR[res.format] ?? TERRACOTTA;
                const coachName = item.coaches?.profiles?.name ?? 'Tu profesional';
                const avatarUrl = item.coaches?.profiles?.avatar_url ?? null;
                const esLectura = res.format === 'lectura';
                const dur = res.duration_seconds ? fmtDuration(res.duration_seconds) : '';
                const meta = `${displayTitle(res.title)}${dur ? ` · ${dur}` : ''}`;
                return (
                  <ScaleCard key={item.id} onPress={() => openReco(item)} activeOpacity={0.92}>
                    <SurfaceCard variant="subtle" backgroundColor={CARD} borderRadius={18} grainOpacity={0.035}>
                      <LinearGradient
                        colors={['rgba(192,107,74,0.09)', 'rgba(192,107,74,0.035)']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                        pointerEvents="none"
                      />
                      <View style={s.recRow}>
                        <View style={s.recAvatarWrap}>
                          {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={s.recAvatar} />
                          ) : (
                            <LinearGradient
                              colors={['#C06B4A', '#A5583B']}
                              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                              style={s.recAvatar}>
                              <Text style={s.recAvatarText}>{initials(coachName)}</Text>
                            </LinearGradient>
                          )}
                          <View style={[s.recFormatBadge, { backgroundColor: color }]}>
                            <Ionicons name={FORMAT_ICON[res.format] ?? 'book-outline'} size={10} color="#FFF5EA" />
                          </View>
                        </View>

                        <View style={s.recBody}>
                          <Text style={s.recMessage} numberOfLines={2}>
                            {item.note ? `“${item.note}”` : `${coachName} te recomendó esto`}
                          </Text>
                          <Text style={s.recMeta} numberOfLines={1}>{meta}</Text>
                        </View>

                        <LinearGradient
                          colors={resourceFormatGradient(res.format)}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={[s.recPlayBtn, { shadowColor: color }]}>
                          <Ionicons
                            name={esLectura ? 'arrow-forward' : 'play'}
                            size={15}
                            color="#FFF5EA"
                            style={esLectura ? undefined : { marginLeft: 1 }}
                          />
                        </LinearGradient>
                      </View>
                    </SurfaceCard>
                  </ScaleCard>
                );
              })
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </AppBg>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,248,240,0.62)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, fontFamily: ViveFonts.semibold, fontSize: 16,
    color: '#565E32', textAlign: 'center', letterSpacing: -0.2,
  },
  headerSpacer: { width: 36 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10, flexGrow: 1 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10, paddingHorizontal: 30 },
  emptyText: { fontFamily: ViveFonts.regular, fontSize: 13, color: 'rgba(135,131,92,0.80)', textAlign: 'center' },

  recRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 14,
  },
  recAvatarWrap: { width: 42, height: 42, flexShrink: 0 },
  recAvatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: TERRACOTTA,
    alignItems: 'center', justifyContent: 'center',
  },
  recAvatarText: { fontFamily: ViveFonts.bold, fontSize: 14, color: '#FFF3E8' },
  recFormatBadge: {
    position: 'absolute', right: -3, bottom: -3, width: 19, height: 19,
    borderRadius: 7, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: CARD,
  },
  recBody: { flex: 1, minWidth: 0, gap: 2 },
  recMessage: {
    fontFamily: ViveFonts.feedback, fontStyle: 'italic', fontSize: 13.5,
    color: '#2E3624', lineHeight: 18,
  },
  recMeta: { fontFamily: ViveFonts.semibold, fontSize: 11, color: FOREST_SOFT },
  recPlayBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
});
