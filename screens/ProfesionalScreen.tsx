import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ViveColors, ViveFonts } from '@/constants/theme';
import { AppBg } from '@/components/ui/AppBg';
import { GlassCard } from '@/components/ui/GlassCard';

// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULT_PROFESIONAL = {
  name: 'Laura Méndez',
  specialty: 'Coach de vida',
  age: '34 años',
  nationality: 'Argentina',
  gender: 'Mujer',
  topics: ['Ansiedad', 'Autoestima', 'Relaciones', 'Propósito', 'Estrés'],
  rating: 4.9,
  reviewCount: 127,
  priceFrom: 4500,
};

const REVIEWS = [
  {
    id: '1',
    name: 'Sofía R.',
    text: 'Laura me ayudó a entender patrones que me bloqueaban hace años. Muy recomendable, tiene una escucha increíble.',
    rating: 5,
  },
  {
    id: '2',
    name: 'Matías T.',
    text: 'Cada sesión la siento como un paso concreto hacia adelante. Clara, empática y muy profesional.',
    rating: 5,
  },
  {
    id: '3',
    name: 'Camila V.',
    text: 'Me sorprendió lo mucho que avancé en pocas sesiones. Tiene una forma de guiar que se siente muy natural.',
    rating: 4,
  },
];

// ─── Subcomponentes ───────────────────────────────────────────────────────────
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <MaterialIcons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-border'}
          size={size}
          color="#E8C547"
        />
      ))}
    </View>
  );
}

function ReviewAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <View style={s.reviewAvatar}>
      <Text style={s.reviewAvatarText}>{initial}</Text>
    </View>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export default function ProfesionalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    name?: string;
    specialty?: string;
    rating?: string;
    reviewCount?: string;
    priceFrom?: string;
    coachId?: string;
    coachProfileId?: string;
  }>();
  const [saved, setSaved] = useState(false);

  const prof = {
    ...DEFAULT_PROFESIONAL,
    ...(params.name && { name: params.name }),
    ...(params.specialty && { specialty: params.specialty }),
    ...(params.rating && { rating: parseFloat(params.rating) }),
    ...(params.reviewCount && { reviewCount: parseInt(params.reviewCount, 10) }),
    ...(params.priceFrom && { priceFrom: parseInt(params.priceFrom, 10) }),
  };

  return (
    <AppBg>
      <StatusBar barStyle="light-content" />

      {/* Botón atrás flotante (absolute) */}
      <SafeAreaView style={s.safe} edges={['top']}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back-ios" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* ── Scroll ───────────────────────────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Foto grande ──────────────────────────────────────────────── */}
        <View style={s.photoContainer}>
          <View style={s.photoPlaceholder}>
            <MaterialIcons name="person" size={90} color="rgba(255,255,255,0.35)" />
          </View>

          {/* Badge verificado */}
          <View style={s.verifiedBadge}>
            <MaterialIcons name="verified" size={14} color="#FFFFFF" />
            <Text style={s.verifiedText}>Verificado por VIVE</Text>
          </View>
        </View>

        {/* ── Info básica ──────────────────────────────────────────────── */}
        <View style={s.infoSection}>
          <Text style={s.name}>{prof.name}</Text>
          <Text style={s.specialty}>{prof.specialty}</Text>
          <Text style={s.metaLine}>{prof.age} · {prof.nationality} · {prof.gender}</Text>

          {/* Chips de temas */}
          <View style={s.chipsRow}>
            {prof.topics.map(topic => (
              <View key={topic} style={s.chip}>
                <Text style={s.chipText}>{topic}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Video de introducción ─────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Video de introducción</Text>
          <GlassCard style={s.videoPlaceholder}>
            <View style={s.playBtn}>
              <MaterialIcons name="play-arrow" size={32} color="#FFFFFF" />
            </View>
            <Text style={s.videoCaption}>
              Conocé a {prof.name.split(' ')[0]} en 1 minuto
            </Text>
          </GlassCard>
        </View>

        {/* ── Reviews ──────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Reseñas</Text>

          {/* Rating general */}
          <GlassCard style={s.ratingOverall}>
            <Text style={s.ratingNumber}>{prof.rating}</Text>
            <View style={s.ratingRight}>
              <Stars rating={prof.rating} size={18} />
              <Text style={s.ratingCount}>{prof.reviewCount} reseñas</Text>
            </View>
          </GlassCard>

          {/* Lista de reviews */}
          <View style={s.reviewsList}>
            {REVIEWS.map(review => (
              <GlassCard key={review.id} style={s.reviewCard}>
                <View style={s.reviewHeader}>
                  <ReviewAvatar name={review.name} />
                  <View style={s.reviewMeta}>
                    <Text style={s.reviewName}>{review.name}</Text>
                    <Stars rating={review.rating} size={12} />
                  </View>
                </View>
                <Text style={s.reviewText}>{review.text}</Text>
              </GlassCard>
            ))}
          </View>
        </View>

        {/* Espaciador para el footer sticky */}
        <View style={{ height: 108 }} />
      </ScrollView>

      {/* ── Footer sticky ────────────────────────────────────────────────── */}
      <SafeAreaView style={s.footerSafe} edges={['bottom']}>
        <View style={s.footer}>
          <View style={s.footerTop}>
            <Text style={s.price}>
              Desde ${prof.priceFrom.toLocaleString('es-AR')} por sesión
            </Text>
          </View>
          <View style={s.footerButtons}>
            <TouchableOpacity
              style={s.btnPrimary}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/booking-calendar',
                  params: {
                    name: prof.name,
                    specialty: prof.specialty,
                    priceFrom: String(prof.priceFrom),
                    ...(params.coachId && { coachId: params.coachId }),
                    ...(params.coachProfileId && { coachProfileId: params.coachProfileId }),
                  },
                })
              }>
              <Text style={s.btnPrimaryText}>Reservar sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btnSecondary, saved && s.btnSecondaryActive]}
              onPress={() => setSaved(v => !v)}
              activeOpacity={0.8}>
              <MaterialIcons
                name={saved ? 'favorite' : 'favorite-border'}
                size={18}
                color="#FFFFFF"
              />
              <Text style={s.btnSecondaryText}>
                {saved ? 'Guardado' : 'Guardar en favoritos'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </AppBg>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  // ── Foto ──────────────────────────────────────────────────────────────
  photoContainer: { width: '100%', height: 300 },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    margin: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ViveColors.accent,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 5,
  },
  verifiedText: {
    fontFamily: ViveFonts.semibold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // ── Info básica ────────────────────────────────────────────────────────
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
  },
  name: {
    fontFamily: ViveFonts.semibold,
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 36,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  specialty: {
    fontFamily: ViveFonts.medium,
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 8,
  },
  metaLine: {
    fontFamily: ViveFonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 14,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  chipText: {
    fontFamily: ViveFonts.medium,
    fontSize: 12,
    color: '#FFFFFF',
  },

  // ── Sección genérica ──────────────────────────────────────────────────
  section: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  sectionTitle: {
    fontFamily: ViveFonts.semibold,
    fontSize: 17,
    color: '#FFFFFF',
    marginBottom: 14,
  },

  // ── Video ─────────────────────────────────────────────────────────────
  videoPlaceholder: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.50)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCaption: {
    fontFamily: ViveFonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },

  // ── Rating general ────────────────────────────────────────────────────
  ratingOverall: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 14,
    gap: 14,
  },
  ratingNumber: {
    fontFamily: ViveFonts.bold,
    fontSize: 40,
    color: '#FFFFFF',
    lineHeight: 48,
  },
  ratingRight: { gap: 4 },
  ratingCount: {
    fontFamily: ViveFonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },

  // ── Reviews ───────────────────────────────────────────────────────────
  reviewsList: { gap: 12 },
  reviewCard: { padding: 14 },
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
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    fontFamily: ViveFonts.semibold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  reviewMeta: { gap: 3 },
  reviewName: {
    fontFamily: ViveFonts.semibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  reviewText: {
    fontFamily: ViveFonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 20,
  },

  // ── Footer sticky ─────────────────────────────────────────────────────
  footerSafe: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.20)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 10 },
      android: { elevation: 8 },
    }),
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },
  footerTop: {},
  price: {
    fontFamily: ViveFonts.semibold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  footerButtons: { gap: 10 },
  btnPrimary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontFamily: ViveFonts.semibold,
    fontSize: 16,
    color: '#1A1A2E',
    letterSpacing: 0.2,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    paddingVertical: 12,
    gap: 8,
  },
  btnSecondaryActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  btnSecondaryText: {
    fontFamily: ViveFonts.semibold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
