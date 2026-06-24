import React from 'react';
import { View, Text, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ViveFonts } from '@/constants/theme';
import { FirstTimeTooltip } from '@/components/FirstTimeTooltip';
import { AppBg } from '@/components/ui/AppBg';
import { GlassCard } from '@/components/ui/GlassCard';

export default function RecursosScreen() {
  return (
    <AppBg>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={s.safe} edges={['top']}>
        <FirstTimeTooltip
          storageKey="vive_tooltip_recursos"
          icon="book-open-outline"
          title="Recursos para vos"
          description="Videos, audios y guías seleccionados según tu camino. Guardá los que más te sirvan."
          delay={800}
        />
        <View style={s.header}>
          <Text style={s.title}>Recursos</Text>
          <Text style={s.subtitle}>Contenido seleccionado para tu camino.</Text>
        </View>
        <View style={s.center}>
          <GlassCard style={s.card}>
            <Feather name="book-open" size={36} color="rgba(255,255,255,0.7)" />
            <Text style={s.cardTitle}>Próximamente</Text>
            <Text style={s.cardSub}>Videos, audios y guías en camino.</Text>
          </GlassCard>
        </View>
      </SafeAreaView>
    </AppBg>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 22,
    paddingTop: 16,
    marginBottom: 8,
  },
  title: {
    fontFamily: ViveFonts.bold,
    fontSize: 32,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: ViveFonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 90,
  },
  card: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  cardTitle: {
    fontFamily: ViveFonts.semibold,
    fontSize: 20,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  cardSub: {
    fontFamily: ViveFonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
});
