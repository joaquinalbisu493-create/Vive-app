// CoachDatosFiscalesScreen — CUIT y condición frente al IVA del profesional
// (03/11/2026).
//
// Sere le factura su comisión a cada profesional una vez por mes: factura A si
// es Responsable Inscripto, B si es monotributista o exento. Sin estos dos
// datos no se le puede facturar.
//
// ⚠️ Los datos NO viven en `coaches` (su lectura es pública): van en
// `coach_datos_fiscales`, con RLS de dueño. Ver la migración 20261103010000.

import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, ScrollView,
  ActivityIndicator, Alert, StatusBar, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ViveColors, ViveFonts } from '@/constants/theme';
import { AppBg } from '@/components/ui/AppBg';
import { CoachHeader } from '@/components/ui/CoachHeader';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  CONDICIONES, cuitError, esCondicionFiscal, formatearCuit, limpiarCuit,
  type CondicionFiscal,
} from '@/lib/datosFiscales';

export default function CoachDatosFiscalesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [coachId, setCoachId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cuit, setCuit] = useState('');
  const [condicion, setCondicion] = useState<CondicionFiscal | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data: coachRow } = await supabase
        .from('coaches').select('id').eq('profile_id', user.id).maybeSingle();
      if (!coachRow?.id) { setLoading(false); return; }
      setCoachId(coachRow.id);

      const { data: fila } = await supabase
        .from('coach_datos_fiscales')
        .select('cuit, condicion')
        .eq('coach_id', coachRow.id)
        .maybeSingle();
      if (fila) {
        setCuit(formatearCuit(fila.cuit as string));
        if (esCondicionFiscal(fila.condicion)) setCondicion(fila.condicion);
      }
      setLoading(false);
    })();
  }, [user]);

  // El error se muestra recién cuando ya escribió 11 números (o más): avisar
  // "te faltan" mientras todavía está tipeando es ruido.
  const errorCuit = limpiarCuit(cuit).length >= 11 ? cuitError(cuit) : null;
  const puedeGuardar = !!coachId && !saving && !cuitError(cuit) && !!condicion;

  async function guardar() {
    if (!coachId || !condicion || !puedeGuardar) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('coach_datos_fiscales')
      .upsert({ coach_id: coachId, cuit: limpiarCuit(cuit), condicion }, { onConflict: 'coach_id' })
      .select('coach_id');
    setSaving(false);

    // Postgrest devuelve 0 filas sin error cuando RLS bloquea.
    if (error || !data || data.length === 0) {
      Alert.alert('No se pudo guardar', 'Revisá los datos y probá de nuevo en unos minutos');
      return;
    }
    Alert.alert('Datos guardados', 'Con esto te hacemos la factura de nuestra comisión cada mes.', [
      { text: 'Listo', onPress: () => router.back() },
    ]);
  }

  return (
    <AppBg>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={s.safe} edges={['top']}>
        <CoachHeader title="Datos para tu factura" />

        {loading ? (
          <View style={s.center}><ActivityIndicator size="large" color={ViveColors.primary} /></View>
        ) : !coachId ? (
          <View style={s.center}>
            <Text style={s.emptyText}>Todavía no completaste tu perfil de profesional</Text>
          </View>
        ) : (
          <KeyboardAvoidingView style={s.flex} behavior="padding">
            <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
              <Text style={s.subtitle}>
                Una vez por mes te hacemos la factura por nuestra comisión. Para hacerla
                necesitamos tu CUIT y tu situación frente al IVA.
              </Text>

              <Text style={s.label}>CUIT</Text>
              <TextInput
                style={[s.input, errorCuit && s.inputError]}
                value={cuit}
                onChangeText={setCuit}
                placeholder="20-12345678-9"
                placeholderTextColor="rgba(135,131,92,0.45)"
                keyboardType="number-pad"
                maxLength={13}
                autoCorrect={false}
              />
              {errorCuit && <Text style={s.errorText}>{errorCuit}</Text>}

              <Text style={s.label}>Tu situación frente al IVA</Text>
              {CONDICIONES.map(c => {
                const on = condicion === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.optRow, on && s.optRowOn]}
                    onPress={() => setCondicion(c.id)}
                    activeOpacity={0.85}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}>
                    <MaterialCommunityIcons
                      name={on ? 'radiobox-marked' : 'radiobox-blank'}
                      size={20}
                      color={on ? ViveColors.primary : 'rgba(135,131,92,0.5)'}
                    />
                    <View style={s.flex}>
                      <Text style={[s.optLabel, on && s.optLabelOn]}>{c.label}</Text>
                      <Text style={s.optDesc}>{c.desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[s.saveBtn, !puedeGuardar && s.saveBtnOff]}
                onPress={guardar}
                disabled={!puedeGuardar}
                activeOpacity={0.85}>
                {saving
                  ? <ActivityIndicator size="small" color="#FFF8F0" />
                  : <Text style={s.saveBtnText}>Guardar</Text>}
              </TouchableOpacity>

              <Text style={s.nota}>
                Estos datos solo los ve el equipo de Sere. No aparecen en tu perfil.
                {'\n\n'}
                Si vivís fuera de Argentina y no tenés CUIT, no hace falta que completes nada.
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </AppBg>
  );
}

const shadow = Platform.select({
  ios: { shadowColor: 'rgba(0,0,0,0.5)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.10, shadowRadius: 4 },
  android: { elevation: 1 },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { fontFamily: ViveFonts.regular, fontSize: 14, color: 'rgba(135,131,92,0.80)', textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  subtitle: { fontFamily: ViveFonts.regular, fontSize: 13, lineHeight: 19, color: 'rgba(135,131,92,0.80)', marginBottom: 6 },
  label: { fontFamily: ViveFonts.semibold, fontSize: 13, color: '#565E32', marginBottom: 8, marginTop: 18 },
  input: {
    backgroundColor: 'rgba(255,248,240,0.62)', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    fontFamily: ViveFonts.regular, fontSize: 15, color: '#565E32',
    borderWidth: 1.5, borderColor: 'transparent', ...shadow,
  },
  inputError: { borderColor: '#B5533A' },
  errorText: { fontFamily: ViveFonts.regular, fontSize: 12, color: '#B5533A', marginTop: 6 },
  optRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,248,240,0.55)', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
    borderWidth: 1.5, borderColor: 'transparent', ...shadow,
  },
  optRowOn: { borderColor: ViveColors.primary, backgroundColor: 'rgba(255,248,240,0.85)' },
  optLabel: { fontFamily: ViveFonts.semibold, fontSize: 14, color: 'rgba(135,131,92,0.85)' },
  optLabelOn: { color: '#565E32' },
  optDesc: { fontFamily: ViveFonts.regular, fontSize: 11.5, color: 'rgba(135,131,92,0.70)' },
  saveBtn: { marginTop: 28, borderRadius: 16, paddingVertical: 15, backgroundColor: ViveColors.primary, alignItems: 'center' },
  saveBtnOff: { opacity: 0.4 },
  saveBtnText: { fontFamily: ViveFonts.semibold, fontSize: 15, color: '#FFF8F0' },
  nota: { fontFamily: ViveFonts.regular, fontSize: 12, lineHeight: 17, color: 'rgba(135,131,92,0.72)', marginTop: 16, textAlign: 'center' },
});
