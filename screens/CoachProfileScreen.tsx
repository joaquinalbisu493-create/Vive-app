import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ViveColors, ViveFonts, TAB_BAR_CLEARANCE } from '@/constants/theme';
import { AppBg } from '@/components/ui/AppBg';

const GLASS = 'rgba(255,255,255,0.14)';
const GLASS_BORDER = 'rgba(255,255,255,0.28)';

type CoachProfile = {
  name: string;
  specialty: string | null;
  bio: string | null;
  price_per_session: number | null;
  nationality: string | null;
};

type ReceivedReview = {
  rating: number;
  comment: string | null;
  reviewerName: string;
  createdAt: string;
  isPrivate: boolean;
};

function formatReviewDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: '2-digit' });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0][0] ?? '').toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function CoachProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [instantMode, setInstantMode] = useState(false);
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [noCoachProfile, setNoCoachProfile] = useState(false);
  const [reviews, setReviews] = useState<ReceivedReview[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [avgRating, setAvgRating] = useState<number | null>(null);

  useEffect(() => {
    if (!user) { setLoadingProfile(false); return; }

    (async () => {
      const [{ data: profileRow }, { data: coachRow }] = await Promise.all([
        supabase.from('profiles').select('name').eq('id', user.id).single(),
        supabase.from('coaches').select('specialty, bio, price_per_session, nationality').eq('profile_id', user.id).maybeSingle(),
      ]);

      setProfile({
        name: profileRow?.name ?? '',
        specialty: coachRow?.specialty ?? null,
        bio: coachRow?.bio ?? null,
        price_per_session: coachRow?.price_per_session ?? null,
        nationality: coachRow?.nationality ?? null,
      });
      setNoCoachProfile(!coachRow);
      setLoadingProfile(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data: reviewRows } = await supabase
        .from('reviews')
        .select('rating, comment, reviewer_id, created_at, is_private')
        .eq('reviewed_id', user.id)
        .order('created_at', { ascending: false });

      if (!reviewRows || reviewRows.length === 0) {
        setReviewsLoaded(true);
        return;
      }

      const reviewerIds = reviewRows.map(r => r.reviewer_id);
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', reviewerIds);

      const nameMap: Record<string, string> = {};
      profileRows?.forEach(p => { nameMap[p.id] = p.name ?? 'Usuario'; });

      const avg = reviewRows.reduce((s, r) => s + r.rating, 0) / reviewRows.length;
      setAvgRating(Math.round(avg * 10) / 10);
      setReviews(reviewRows.map(r => ({
        rating: r.rating,
        comment: r.comment,
        reviewerName: nameMap[r.reviewer_id] ?? 'Usuario',
        createdAt: r.created_at,
        isPrivate: r.is_private,
      })));
      setReviewsLoaded(true);
    })();
  }, [user]);

  async function handleSignOut() {
    await signOut();
    router.replace('/(tabs)');
  }

  const initials = profile?.name ? getInitials(profile.name) : loadingProfile ? '…' : '?';

  return (
    <AppBg>
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        {/* ── Photo + Info ───────────────────────────────────── */}
        <View style={s.identitySection}>
          <View style={s.photoWrap}>
            <View style={s.photoPlaceholder}>
              <Text style={s.photoInitials}>{initials}</Text>
            </View>
            <TouchableOpacity style={s.editPhotoBtn} activeOpacity={0.8}>
              <MaterialCommunityIcons name="camera-outline" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={s.coachName}>
            {loadingProfile ? '…' : (profile?.name || '—')}
          </Text>

          {noCoachProfile ? (
            <Text style={s.emptyCoachText}>Todavía no completaste tu perfil de coach</Text>
          ) : (
            <>
              {profile?.specialty ? (
                <Text style={s.coachSpecialty}>{profile.specialty}</Text>
              ) : null}
              {profile?.bio ? (
                <Text style={s.coachBio}>{profile.bio}</Text>
              ) : null}
              {profile?.nationality ? (
                <Text style={s.coachMeta}>{profile.nationality}</Text>
              ) : null}
            </>
          )}

          <TouchableOpacity style={s.editProfileBtn} activeOpacity={0.75}>
            <Text style={s.editProfileBtnText}>Editar perfil</Text>
          </TouchableOpacity>
        </View>

        {/* ── Temas ─────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Temas que trabajo</Text>
        <View style={s.chipsWrap}>
          <TouchableOpacity style={s.addChip} activeOpacity={0.7}>
            <MaterialCommunityIcons name="plus" size={14} color={ViveColors.primary} />
            <Text style={s.addChipText}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {/* ── Precios ───────────────────────────────────────── */}
        <Text style={[s.sectionTitle, s.sectionSpaced]}>Precio y paquetes</Text>
        <View style={s.priceCard}>
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>Sesión individual</Text>
            <Text style={s.priceValue}>
              {profile?.price_per_session != null
                ? `$${profile.price_per_session.toLocaleString('es-AR')}`
                : '—'}
            </Text>
          </View>
        </View>

        {/* ── Modo de reserva ───────────────────────────────── */}
        <Text style={[s.sectionTitle, s.sectionSpaced]}>Modalidad de reserva</Text>
        <View style={s.toggleCard}>
          <View style={s.toggleInfo}>
            <Text style={s.toggleTitle}>{instantMode ? 'Instantánea' : 'Con confirmación'}</Text>
            <Text style={s.toggleDesc}>
              {instantMode
                ? 'Los usuarios reservan directamente sin esperar tu aprobación.'
                : 'Cada reserva requiere tu confirmación antes de quedar fijada.'}
            </Text>
          </View>
          <Switch
            value={instantMode}
            onValueChange={setInstantMode}
            trackColor={{ false: `${ViveColors.text}25`, true: ViveColors.accent }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={`${ViveColors.text}25`}
          />
        </View>

        {/* ── Disponibilidad ────────────────────────────────── */}
        <Text style={[s.sectionTitle, s.sectionSpaced]}>Disponibilidad</Text>
        <TouchableOpacity
          style={s.availBtn}
          onPress={() => router.push('/coach-availability')}
          activeOpacity={0.75}
        >
          <MaterialCommunityIcons name="calendar-clock" size={18} color={ViveColors.primary} />
          <Text style={s.availBtnText}>Gestionar disponibilidad</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>

        {/* ── Video perfil ──────────────────────────────────── */}
        <Text style={[s.sectionTitle, s.sectionSpaced]}>Video de perfil</Text>
        <View style={s.videoCard}>
          <View style={s.videoPlaceholder}>
            <MaterialCommunityIcons name="video-outline" size={36} color="rgba(255,255,255,0.35)" />
            <Text style={s.videoPlaceholderText}>Sin video grabado</Text>
          </View>
          <TouchableOpacity style={s.recordBtn} onPress={() => console.log('[Coach] grabar video')} activeOpacity={0.85}>
            <MaterialCommunityIcons name="record-circle-outline" size={16} color={ViveColors.primary} />
            <Text style={s.recordBtnText}>Grabar nuevo video</Text>
          </TouchableOpacity>
        </View>

        {/* ── Reseñas recibidas ─────────────────────────────── */}
        <Text style={[s.sectionTitle, s.sectionSpaced]}>Reseñas recibidas</Text>
        {!reviewsLoaded ? null : reviews.length === 0 ? (
          <View style={s.reviewsEmpty}>
            <MaterialCommunityIcons name="star-outline" size={28} color="rgba(255,255,255,0.25)" />
            <Text style={s.reviewsEmptyText}>
              Todavía no recibiste reseñas.{'\n'}Aparecerán acá después de cada sesión completada.
            </Text>
          </View>
        ) : (
          <View style={s.reviewsPanel}>
            {/* Resumen de rating */}
            <View style={s.ratingSummary}>
              <Text style={s.ratingBig}>{avgRating?.toFixed(1)}</Text>
              <View style={s.ratingSummaryRight}>
                <View style={s.starsRow}>
                  {[1,2,3,4,5].map(i => (
                    <MaterialIcons
                      key={i}
                      name={i <= Math.round(avgRating ?? 0) ? 'star' : 'star-border'}
                      size={16}
                      color="#E8C547"
                    />
                  ))}
                </View>
                <Text style={s.reviewCount}>{reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'}</Text>
              </View>
            </View>

            {/* Lista */}
            <View style={s.reviewsList}>
              {reviews.map((r, i) => (
                <View key={i} style={s.reviewCard}>
                  <View style={s.reviewHeader}>
                    <View style={s.reviewAvatar}>
                      <Text style={s.reviewAvatarText}>{r.reviewerName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={s.reviewMeta}>
                      <View style={s.reviewNameRow}>
                        <Text style={s.reviewerName}>{r.reviewerName}</Text>
                        {r.isPrivate && (
                          <MaterialIcons name="lock-outline" size={12} color="rgba(255,255,255,0.4)" />
                        )}
                      </View>
                      <View style={s.starsRow}>
                        {[1,2,3,4,5].map(j => (
                          <MaterialIcons
                            key={j}
                            name={j <= r.rating ? 'star' : 'star-border'}
                            size={12}
                            color="#E8C547"
                          />
                        ))}
                      </View>
                    </View>
                    <Text style={s.reviewDate}>{formatReviewDate(r.createdAt)}</Text>
                  </View>
                  {!!r.comment && (
                    <Text style={s.reviewComment}>{r.comment}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Cerrar sesión ─────────────────────────────────── */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.75}>
          <MaterialCommunityIcons name="logout" size={16} color="#E05252" />
          <Text style={s.signOutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <View style={{ height: TAB_BAR_CLEARANCE }} />
      </ScrollView>
    </SafeAreaView>
    </AppBg>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingTop: 0, paddingHorizontal: 0 },

  // Identity section
  identitySection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
    backgroundColor: GLASS,
    borderBottomWidth: 1,
    borderBottomColor: GLASS_BORDER,
    marginBottom: 24,
  },
  photoWrap: { position: 'relative', marginBottom: 16 },
  photoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${ViveColors.primary}25`,
    borderWidth: 2.5,
    borderColor: ViveColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitials: {
    fontFamily: ViveFonts.bold,
    fontSize: 30,
    color: '#FFFFFF',
  },
  editPhotoBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ViveColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  coachName: {
    fontFamily: ViveFonts.semibold,
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  coachSpecialty: {
    fontFamily: ViveFonts.medium,
    fontSize: 14,
    color: ViveColors.primary,
    marginBottom: 4,
  },
  coachBio: {
    fontFamily: ViveFonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  coachMeta: {
    fontFamily: ViveFonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 18,
  },
  emptyCoachText: {
    fontFamily: ViveFonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginBottom: 18,
    marginTop: 4,
    paddingHorizontal: 8,
  },
  editProfileBtn: {
    borderWidth: 1.5,
    borderColor: ViveColors.primary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 22,
    marginTop: 4,
  },
  editProfileBtnText: {
    fontFamily: ViveFonts.medium,
    fontSize: 13,
    color: ViveColors.primary,
  },

  // Sections
  sectionTitle: {
    fontFamily: ViveFonts.semibold,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  sectionSpaced: { marginTop: 28 },

  // Topics
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 8,
  },
  topicChip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  topicChipText: {
    fontFamily: ViveFonts.medium,
    fontSize: 13,
    color: '#FFFFFF',
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: `${ViveColors.primary}60`,
    gap: 3,
  },
  addChipText: {
    fontFamily: ViveFonts.medium,
    fontSize: 13,
    color: ViveColors.primary,
  },

  // Price
  priceCard: {
    backgroundColor: GLASS,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 16,
    marginHorizontal: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 12,
  },
  priceLabel: {
    fontFamily: ViveFonts.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  priceSaving: {
    fontFamily: ViveFonts.regular,
    fontSize: 12,
    color: ViveColors.accent,
    marginTop: 2,
  },
  priceValue: {
    fontFamily: ViveFonts.semibold,
    fontSize: 15,
    color: '#FFFFFF',
  },

  // Toggle
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GLASS,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 16,
    marginHorizontal: 20,
    gap: 16,
  },
  toggleInfo: { flex: 1 },
  toggleTitle: {
    fontFamily: ViveFonts.semibold,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 3,
  },
  toggleDesc: {
    fontFamily: ViveFonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },

  availBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GLASS,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 16,
    marginHorizontal: 20,
    gap: 12,
  },
  availBtnText: {
    flex: 1,
    fontFamily: ViveFonts.semibold,
    fontSize: 14,
    color: '#FFFFFF',
  },

  // Video
  videoCard: {
    backgroundColor: GLASS,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 16,
    marginHorizontal: 20,
    alignItems: 'center',
    gap: 16,
  },
  videoPlaceholder: {
    width: '100%',
    height: 130,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
  },
  videoPlaceholderText: {
    fontFamily: ViveFonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: ViveColors.primary,
  },
  recordBtnText: {
    fontFamily: ViveFonts.semibold,
    fontSize: 13,
    color: ViveColors.primary,
  },

  // Reviews recibidas
  reviewsEmpty: {
    backgroundColor: GLASS,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 24,
    marginHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  reviewsEmptyText: {
    fontFamily: ViveFonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
  reviewsPanel: {
    marginHorizontal: 20,
    gap: 14,
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: GLASS,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 16,
  },
  ratingBig: {
    fontFamily: ViveFonts.bold,
    fontSize: 40,
    color: '#FFFFFF',
    lineHeight: 48,
  },
  ratingSummaryRight: { gap: 4 },
  starsRow: { flexDirection: 'row', gap: 2 },
  reviewCount: {
    fontFamily: ViveFonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  reviewsList: { gap: 10 },
  reviewCard: {
    backgroundColor: GLASS,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 14,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  reviewAvatarText: {
    fontFamily: ViveFonts.semibold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  reviewMeta: { flex: 1, gap: 3 },
  reviewNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reviewerName: {
    fontFamily: ViveFonts.semibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  reviewDate: {
    fontFamily: ViveFonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    flexShrink: 0,
  },
  reviewComment: {
    fontFamily: ViveFonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 19,
  },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 14,
  },
  signOutText: {
    fontFamily: ViveFonts.medium,
    fontSize: 14,
    color: '#E05252',
  },
});
