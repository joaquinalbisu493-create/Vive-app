import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { ScaleCard } from '@/components/ScaleCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ViveColors, ViveFonts } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { AppBg } from '@/components/ui/AppBg';
import { VitaWordmark } from '@/components/VitaWordmark';
import { LARGO_MIN_CONTRASENA } from '@/lib/authErrores';

// Elegir o cambiar la contraseña con la sesión ya abierta. Se llega desde los
// ajustes, o al final de la recuperación: "¿Olvidaste tu contraseña?" abre
// VerificarMailScreen en `modo: 'recuperar'`, que entra con un código por mail
// y después trae acá con `recuperada=1` (solo cambia los textos).
//
// 🔒 Antes acá caía el link de `resetPasswordForEmail` con `?code=` y se
// canjeaba con `exchangeCodeForSession`. Se sacó el 27/10/2026: el link volvía
// por `viveapp://`, que cualquier otra app instalada puede reclamar, y quien
// pedía el mail a nombre de otra persona tenía el verificador PKCE para canjear
// lo que interceptara. Un `?code=` que llegue igual por un link viejo se ignora.
//
// ⚠️ `nueva-contrasena` está en PANTALLAS_SIN_CUENTA (lib/entrada.ts) para que
// `AuthRedirect` no la patee; sin sesión, la pantalla misma lo dice.

type Estado = 'cargando' | 'listo' | 'sinSesion' | 'guardado';

const MIN_PASS = LARGO_MIN_CONTRASENA;

export default function NuevaContrasenaScreen() {
  const router = useRouter();
  const { recuperada } = useLocalSearchParams<{ recuperada?: string }>();
  // Desde los ajustes: "Crear o cambiar tu contraseña". Existe sobre todo para
  // quien entró con un código (la cuenta nacida en la web no tiene contraseña),
  // pero sirve para cualquiera.
  const desdeAjustes = (Array.isArray(recuperada) ? recuperada[0] : recuperada) !== '1';

  const [estado, setEstado] = useState<Estado>('cargando');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => setEstado(data.session ? 'listo' : 'sinSesion'))
      .catch(() => setEstado('sinSesion'));
  }, []);

  async function guardar() {
    setError(null);
    if (pass.length < MIN_PASS) { setError(`La contraseña debe tener al menos ${MIN_PASS} caracteres`); return; }
    if (pass !== pass2) { setError('Las contraseñas no coinciden'); return; }

    setGuardando(true);
    const { error: e } = await supabase.auth.updateUser({ password: pass });
    setGuardando(false);
    if (e) {
      // Con "Secure password change" prendido, Supabase pide haber entrado hace
      // poco. Decirlo concreto: un "probá de nuevo" haría reintentar sin sentido.
      setError(/reauth/i.test(e.message)
        ? 'Por seguridad, cerrá sesión, volvé a entrar y probá de nuevo'
        : 'No se pudo cambiar la contraseña. Probá de nuevo');
      return;
    }
    setEstado('guardado');
  }

  return (
    <AppBg>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView
          style={s.flex}
          behavior="padding">
          <ScrollView
            contentContainerStyle={s.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            <View style={s.logoWrap}>
              <VitaWordmark />
            </View>

            {estado === 'cargando' && (
              <ActivityIndicator color={ViveColors.primary} />
            )}

            {estado === 'sinSesion' && (
              <View style={s.headingArea}>
                <Text style={s.heading}>Primero entrá a tu cuenta</Text>
                <Text style={s.subheading}>
                  Si no te acordás la contraseña, tocá «¿Olvidaste tu contraseña?» en el inicio de
                  sesión: te mandamos un código por mail.
                </Text>
                <ScaleCard
                  style={s.enterBtn}
                  onPress={() => router.replace('/login')}
                  activeOpacity={0.85}>
                  <Text style={s.enterBtnText}>Volver al inicio de sesión</Text>
                </ScaleCard>
              </View>
            )}

            {estado === 'guardado' && (
              <View style={s.headingArea}>
                <Text style={s.heading}>Listo</Text>
                <Text style={s.subheading}>
                  {desdeAjustes ? 'Tu contraseña quedó guardada.' : 'Ya podés entrar con tu contraseña nueva.'}
                </Text>
                <ScaleCard
                  style={s.enterBtn}
                  // Desde los ajustes se vuelve adonde estaba: mandar a `/(tabs)`
                  // haría rebotar a un coach hasta `/(coach)`.
                  onPress={() => (desdeAjustes ? router.back() : router.replace('/(tabs)' as any))}
                  activeOpacity={0.85}>
                  <Text style={s.enterBtnText}>{desdeAjustes ? 'Volver' : 'Entrar'}</Text>
                </ScaleCard>
              </View>
            )}

            {estado === 'listo' && (
              <>
                <View style={s.headingArea}>
                  <Text style={s.heading}>{desdeAjustes ? 'Tu contraseña' : 'Elegí una contraseña nueva'}</Text>
                  <Text style={s.subheading}>
                    {desdeAjustes
                      ? `Para entrar sin esperar un código por mail. Mínimo ${MIN_PASS} caracteres.`
                      : `Mínimo ${MIN_PASS} caracteres.`}
                  </Text>
                </View>

                <View style={s.form}>
                  <View style={s.inputRow}>
                    <TextInput
                      style={s.inputInner}
                      value={pass}
                      onChangeText={v => { setPass(v); setError(null); }}
                      placeholder="Contraseña nueva"
                      placeholderTextColor="rgba(135,131,92,0.45)"
                      secureTextEntry={!verPass}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setVerPass(v => !v)} hitSlop={8}>
                      <MaterialCommunityIcons
                        name={verPass ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="rgba(135,131,92,0.80)"
                      />
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={s.input}
                    value={pass2}
                    onChangeText={v => { setPass2(v); setError(null); }}
                    placeholder="Confirmá la contraseña"
                    placeholderTextColor="rgba(135,131,92,0.45)"
                    secureTextEntry={!verPass}
                    autoCapitalize="none"
                  />

                  {error && <Text style={s.serverError}>{error}</Text>}

                  <ScaleCard
                    style={s.enterBtn}
                    onPress={guardar}
                    activeOpacity={0.85}
                    disabled={guardando}>
                    {guardando
                      ? <ActivityIndicator size="small" color="#F7EFE4" />
                      : <Text style={s.enterBtnText}>Guardar contraseña</Text>}
                  </ScaleCard>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AppBg>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 52,
    paddingBottom: 36,
    justifyContent: 'center',
    gap: 32,
  },
  logoWrap: { alignItems: 'center' },
  headingArea: { alignItems: 'center', gap: 12 },
  heading: {
    fontFamily: ViveFonts.title,
    fontSize: 24,
    color: '#565E32',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subheading: {
    fontFamily: ViveFonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: '#87835C',
    textAlign: 'center',
  },
  form: { gap: 12 },
  input: {
    backgroundColor: 'rgba(86,94,50,0.12)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: ViveFonts.regular,
    fontSize: 15,
    color: '#565E32',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(86,94,50,0.12)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  inputInner: {
    flex: 1,
    fontFamily: ViveFonts.regular,
    fontSize: 15,
    color: '#565E32',
    padding: 0,
  },
  serverError: {
    fontFamily: ViveFonts.regular,
    fontSize: 13,
    color: '#C4553A',
    textAlign: 'center',
  },
  enterBtn: {
    backgroundColor: '#565E32',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 8,
    alignSelf: 'stretch',
  },
  enterBtnText: {
    fontFamily: ViveFonts.semibold,
    fontSize: 16,
    color: '#F7EFE4',
    letterSpacing: 0.2,
  },
});
