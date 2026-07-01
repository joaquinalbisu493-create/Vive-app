import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ViveColors, ViveFonts } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { AppBg } from '@/components/ui/AppBg';

const SPECIALTIES = [
  'Coach de vida',
  'Psicóloga clínica',
  'Nutricionista',
  'Coach de hábitos',
  'Terapeuta',
  'Psiquiatra',
  'Coach corporal',
  'Meditación y mindfulness',
];

const BIO_MAX = 500;

const fadeUp = (anim: Animated.Value) => ({
  opacity: anim,
  transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
});

function isValidUrl(url: string) {
  return url.startsWith('http://') || url.startsWith('https://');
}

export default function CoachApplicationScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [specialty, setSpecialty] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [price, setPrice] = useState('');
  const [nationality, setNationality] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(formAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (submitted) {
      Animated.timing(successAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [submitted]);

  async function handleSubmit() {
    if (!specialty) { setSubmitError('Elegí una especialidad.'); return; }
    if (bio.trim().length < 10) { setSubmitError('Contanos un poco más sobre vos en la bio.'); return; }
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      setSubmitError('Ingresá un precio válido por sesión.');
      return;
    }
    if (!nationality.trim()) { setSubmitError('Ingresá tu nacionalidad.'); return; }
    if (!videoUrl.trim()) { setSubmitError('Ingresá el link de tu video de presentación.'); return; }
    if (!isValidUrl(videoUrl.trim())) {
      setSubmitError('El link del video debe comenzar con http:// o https://');
      return;
    }
    if (!user) { setSubmitError('No encontramos tu sesión. Volvé a ingresar.'); return; }

    setSubmitting(true);
    setSubmitError(null);

    const { error } = await supabase.from('coaches').insert({
      profile_id: user.id,
      specialty,
      bio: bio.trim(),
      price_per_session: Number(price),
      nationality: nationality.trim(),
      application_video_url: videoUrl.trim(),
      verified: false,
    });

    setSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        setSubmitError('Ya tenemos una solicitud de este perfil. Nos ponemos en contacto pronto.');
      } else {
        setSubmitError(`No pudimos enviar tu solicitud. (${error.message})`);
      }
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <AppBg>
      <SafeAreaView style={styles.container}>
        <Animated.View style={[styles.successContainer, fadeUp(successAnim)]}>
          <View style={styles.successIcon}>
            <MaterialCommunityIcons name="check-circle-outline" size={64} color={ViveColors.accent} />
          </View>
          <Text style={styles.successTitle}>¡Listo! Tu solicitud está en revisión.</Text>
          <Text style={styles.successSubtitle}>
            Te vamos a contactar pronto para contarte los próximos pasos.
          </Text>
          <TouchableOpacity
            style={styles.successButton}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Volver a Inicio</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
      </AppBg>
    );
  }

  return (
    <AppBg>
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.header, fadeUp(headerAnim)]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
              <MaterialCommunityIcons name="arrow-left" size={20} color="#565E32" />
              <Text style={styles.backText}>Atrás</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.content, fadeUp(formAnim)]}>
            <View style={styles.titleArea}>
              <Text style={styles.title}>Contanos sobre vos</Text>
              <Text style={styles.subtitle}>
                Con esta info armamos tu perfil y lo revisamos antes de activar tu cuenta como profesional.
              </Text>
            </View>

            {/* Especialidad */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Especialidad</Text>
              <View style={styles.specialtyGrid}>
                {SPECIALTIES.map((s) => {
                  const isSelected = specialty === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setSpecialty(s)}
                      activeOpacity={0.75}
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                      ]}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Bio */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={styles.sectionLabel}>Bio</Text>
                <Text style={styles.charCount}>{bio.length}/{BIO_MAX}</Text>
              </View>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
                placeholder="Contanos sobre tu experiencia y cómo trabajás"
                placeholderTextColor="rgba(135,131,92,0.45)"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                autoCorrect
              />
            </View>

            {/* Precio */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Precio propuesto por sesión (ARS)</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="Ej: 8000"
                placeholderTextColor="rgba(135,131,92,0.45)"
                keyboardType="numeric"
              />
            </View>

            {/* Nacionalidad */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Nacionalidad</Text>
              <TextInput
                style={styles.input}
                value={nationality}
                onChangeText={setNationality}
                placeholder="Ej: Argentina"
                placeholderTextColor="rgba(135,131,92,0.45)"
                autoCapitalize="words"
              />
            </View>

            {/* Video */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Link de video de presentación</Text>
              <Text style={styles.fieldHint}>
                Compartinos un video corto contándonos quién sos y cómo trabajás — puede ser un link de YouTube, Drive, o similar.
              </Text>
              <TextInput
                style={styles.input}
                value={videoUrl}
                onChangeText={setVideoUrl}
                placeholder="https://..."
                placeholderTextColor="rgba(135,131,92,0.45)"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {submitError && (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#C0392B" />
                <Text style={styles.errorText}>{submitError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={submitting}
            >
              <Text style={styles.buttonText}>
                {submitting ? 'Enviando...' : 'Enviar solicitud'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </AppBg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: {
    fontFamily: ViveFonts.medium,
    fontSize: 13,
    color: '#87835C',
  },
  content: { paddingHorizontal: 24, paddingTop: 24, gap: 24 },
  titleArea: { gap: 8 },
  title: {
    fontFamily: ViveFonts.semibold,
    fontSize: 30,
    color: '#565E32',
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  subtitle: {
    fontFamily: ViveFonts.regular,
    fontSize: 14,
    color: '#87835C',
    lineHeight: 21,
  },
  section: { gap: 8 },
  sectionLabel: {
    fontFamily: ViveFonts.medium,
    fontSize: 13,
    color: '#87835C',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontFamily: ViveFonts.regular,
    fontSize: 12,
    color: 'rgba(135,131,92,0.58)',
  },
  specialtyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,248,240,0.48)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  chipSelected: {
    backgroundColor: 'rgba(107,191,138,0.22)',
    borderColor: ViveColors.accent,
  },
  chipText: {
    fontFamily: ViveFonts.regular,
    fontSize: 13,
    color: '#87835C',
  },
  chipTextSelected: {
    fontFamily: ViveFonts.medium,
    color: '#565E32',
  },
  input: {
    backgroundColor: 'rgba(255,248,240,0.48)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: ViveFonts.regular,
    fontSize: 15,
    color: '#565E32',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  bioInput: { minHeight: 120, paddingTop: 14 },
  fieldHint: {
    fontFamily: ViveFonts.regular,
    fontSize: 12,
    color: 'rgba(135,131,92,0.72)',
    lineHeight: 17,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(224,82,82,0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    fontFamily: ViveFonts.regular,
    fontSize: 13,
    color: '#FF7070',
    flex: 1,
    lineHeight: 18,
  },
  button: {
    backgroundColor: ViveColors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    fontFamily: ViveFonts.semibold,
    fontSize: 17,
    color: '#565E32',
    letterSpacing: 0.3,
  },
  successContainer: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  successIcon: { marginBottom: 8 },
  successTitle: {
    fontFamily: ViveFonts.semibold,
    fontSize: 26,
    color: '#565E32',
    letterSpacing: -0.3,
    lineHeight: 34,
    textAlign: 'center',
  },
  successSubtitle: {
    fontFamily: ViveFonts.regular,
    fontSize: 15,
    color: '#87835C',
    lineHeight: 22,
    textAlign: 'center',
  },
  successButton: {
    backgroundColor: ViveColors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: 'center',
    marginTop: 12,
  },
});
