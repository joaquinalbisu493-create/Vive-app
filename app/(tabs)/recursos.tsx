import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ViveFonts, TAB_BAR_CLEARANCE } from '@/constants/theme';
import { ScaleCard } from '@/components/ScaleCard';
import { FirstTimeTooltip } from '@/components/FirstTimeTooltip';
import { AppBg } from '@/components/ui/AppBg';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Tool {
  id: string;
  label: string;
  icon: IoniconName;
  route?: string;
}

interface CoachResource {
  id: string;
  title: string;
  subtitle: string;
  icon: IoniconName;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const TOOLS: Tool[] = [
  { id: 'diario',      label: 'Diario',           icon: 'book-outline',           route: '/diario'   },
  { id: 'gratitud',    label: 'Gratitud',          icon: 'heart-outline',          route: '/gratitud' },
  { id: 'sueno',       label: 'Sueño',             icon: 'moon-outline'                               },
  { id: 'respiracion', label: 'Respiración',       icon: 'cloud-outline'                              },
  { id: 'meditacion',  label: 'Meditación',        icon: 'leaf-outline'                               },
  { id: 'escaner',     label: 'Escáner corporal',  icon: 'body-outline'                               },
  { id: 'relajacion',  label: 'Relajación',        icon: 'musical-notes-outline'                      },
  { id: 'ruido',       label: 'Ruido blanco',      icon: 'volume-medium-outline'                      },
  { id: 'lecturas',    label: 'Lecturas breves',   icon: 'library-outline'                            },
];

const COACH_RESOURCES: CoachResource[] = [
  { id: 'cr1', title: 'Respiración 4-7-8',  subtitle: 'Recomendado por María González · 5 min',  icon: 'cloud-outline'  },
  { id: 'cr2', title: 'Diario de gratitud', subtitle: 'Recomendado por María González · 10 min', icon: 'heart-outline'  },
];

// ─── ToolCard ─────────────────────────────────────────────────────────────────
function ToolCard({
  tool,
  saved,
  onSave,
}: {
  tool: Tool;
  saved: boolean;
  onSave: () => void;
}) {
  const router = useRouter();
  return (
    <ScaleCard
      style={s.toolCard}
      onPress={() => { if (tool.route) router.push(tool.route as any); }}
      activeOpacity={0.88}>
      <TouchableOpacity style={s.bookmarkBtn} onPress={onSave} hitSlop={8}>
        <Ionicons
          name={saved ? 'bookmark' : 'bookmark-outline'}
          size={15}
          color={saved ? '#C1694F' : '#87835C'}
        />
      </TouchableOpacity>
      <Ionicons name={tool.icon} size={28} color="#565E32" />
      <Text style={s.toolLabel}>{tool.label}</Text>
    </ScaleCard>
  );
}

// ─── CoachResourceCard ────────────────────────────────────────────────────────
function CoachResourceCard({ resource }: { resource: CoachResource }) {
  return (
    <View style={s.coachCard}>
      <View style={s.coachIconWrap}>
        <Ionicons name={resource.icon} size={20} color="#565E32" />
      </View>
      <View style={s.coachInfo}>
        <Text style={s.coachTitle}>{resource.title}</Text>
        <Text style={s.coachSubtitle}>{resource.subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color="rgba(135,131,92,0.52)" />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function RecursosScreen() {
  const router = useRouter();
  const { user, requestAuth } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase
      .from('saved_resources')
      .select('resource_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setSavedIds(new Set(data.map(r => r.resource_id as string)));
      });
  }, [user]);

  async function toggleSave(resourceId: string) {
    if (!user) { requestAuth(); return; }
    const isSaved = savedIds.has(resourceId);
    setSavedIds(prev => {
      const next = new Set(prev);
      if (isSaved) next.delete(resourceId); else next.add(resourceId);
      return next;
    });
    if (isSaved) {
      await supabase
        .from('saved_resources')
        .delete()
        .eq('user_id', user.id)
        .eq('resource_id', resourceId);
    } else {
      await supabase
        .from('saved_resources')
        .insert({ user_id: user.id, resource_id: resourceId });
    }
  }

  const savedTools = TOOLS.filter(t => savedIds.has(t.id));

  return (
    <AppBg>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={s.safe} edges={['top']}>
        <FirstTimeTooltip
          storageKey="vive_tooltip_recursos"
          icon="book-open-outline"
          title="Recursos para vos"
          description="Herramientas de bienestar para usar cuando quieras, a tu ritmo."
          delay={800}
        />
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.container}
          showsVerticalScrollIndicator={false}>

          <Text style={s.pageTitle}>Recursos</Text>

          {/* Mis recursos */}
          {savedTools.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Mis recursos</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.savedScroll}
                contentContainerStyle={s.savedContent}>
                {savedTools.map(tool => (
                  <TouchableOpacity
                    key={tool.id}
                    style={s.savedChip}
                    onPress={() => { if (tool.route) router.push(tool.route as any); }}
                    activeOpacity={0.8}>
                    <Ionicons name={tool.icon} size={14} color="#C1694F" />
                    <Text style={s.savedChipLabel}>{tool.label}</Text>
                    <TouchableOpacity onPress={() => toggleSave(tool.id)} hitSlop={6}>
                      <Ionicons name="close-circle" size={15} color="rgba(135,131,92,0.40)" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={{ height: 24 }} />
            </>
          )}

          {/* Recomendados por tu coach */}
          {COACH_RESOURCES.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Recomendados por tu coach</Text>
              {COACH_RESOURCES.map(r => (
                <CoachResourceCard key={r.id} resource={r} />
              ))}
            </>
          )}

          {/* Herramientas */}
          <Text style={[s.sectionTitle, COACH_RESOURCES.length > 0 && s.sectionSpaced]}>
            Herramientas
          </Text>
          <View style={s.grid}>
            {[0, 1, 2].map(row => (
              <View key={row} style={s.gridRow}>
                {TOOLS.slice(row * 3, row * 3 + 3).map(tool => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    saved={savedIds.has(tool.id)}
                    onSave={() => toggleSave(tool.id)}
                  />
                ))}
              </View>
            ))}
          </View>

          <View style={{ height: TAB_BAR_CLEARANCE }} />
        </ScrollView>
      </SafeAreaView>
    </AppBg>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  pageTitle: {
    fontFamily: ViveFonts.semibold,
    fontSize: 26,
    color: '#565E32',
    marginBottom: 20,
  },

  sectionTitle: {
    fontFamily: ViveFonts.semibold,
    fontSize: 15,
    color: '#565E32',
    marginBottom: 12,
  },
  sectionSpaced: { marginTop: 28 },

  coachCard: {
    backgroundColor: 'rgba(255,248,240,0.55)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  coachIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,248,240,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  coachInfo: { flex: 1 },
  coachTitle: {
    fontFamily: ViveFonts.semibold,
    fontSize: 14,
    color: '#565E32',
    lineHeight: 20,
    marginBottom: 2,
  },
  coachSubtitle: {
    fontFamily: ViveFonts.regular,
    fontSize: 11,
    color: 'rgba(135,131,92,0.80)',
    lineHeight: 16,
  },

  // ── Mis recursos ──────────────────────────────────────────────────────────
  savedScroll: { marginHorizontal: -20 },
  savedContent: { paddingHorizontal: 20, gap: 8, flexDirection: 'row' },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,248,240,0.55)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(193,105,79,0.25)',
  },
  savedChipLabel: {
    fontFamily: ViveFonts.medium,
    fontSize: 12,
    color: '#565E32',
  },

  // ── Herramientas grid ─────────────────────────────────────────────────────
  grid: { gap: 10 },
  gridRow: { flexDirection: 'row', gap: 10 },
  toolCard: {
    flex: 1,
    backgroundColor: 'rgba(255,248,240,0.55)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    paddingVertical: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    minHeight: 96,
  },
  toolLabel: {
    fontFamily: ViveFonts.medium,
    fontSize: 11,
    color: '#565E32',
    textAlign: 'center',
    lineHeight: 15,
  },
  bookmarkBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
