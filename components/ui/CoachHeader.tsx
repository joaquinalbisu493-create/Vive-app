import type { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ViveFonts } from '@/constants/theme';

// Header compartido de las pantallas pusheadas del lado del profesional
// (Agenda, Disponibilidad, Notificaciones, etc.). Antes cada una copiaba su
// propio header con variaciones (ícono `arrow-back-ios` vs `chevron-left`, color
// #565E32 vs FOREST, estilos `backBtn`/`back`): se unificó para que no diverjan.
//
// Patrón: botón atrás en círculo crema (izquierda) + título centrado, con un
// spacer a la derecha del mismo ancho para que el título quede centrado de
// verdad. `right` reemplaza el spacer cuando la pantalla tiene una acción.
export function CoachHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const router = useRouter();
  return (
    <View style={s.header}>
      <TouchableOpacity
        onPress={onBack ?? (() => router.back())}
        style={s.backBtn}
        hitSlop={8}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Volver">
        <Ionicons name="arrow-back" size={20} color="#565E32" />
      </TouchableOpacity>
      <Text style={s.title} numberOfLines={1}>{title}</Text>
      {right ? <View style={s.right}>{right}</View> : <View style={s.spacer} />}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,248,240,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: ViveFonts.semibold,
    fontSize: 18,
    color: '#565E32',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  right: { minWidth: 36, alignItems: 'flex-end' },
  spacer: { width: 36 },
});
