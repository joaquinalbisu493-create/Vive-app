import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { ScaleCard } from '@/components/ScaleCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ViveFonts } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { AppBg } from '@/components/ui/AppBg';
import { escribirnos, EMAIL_CONTACTO } from '@/lib/contacto';

// Cambiar el mail de la cuenta, con la sesión abierta (28/10/2026).
//
// 🔒 Hacen falta DOS códigos: uno que llega al mail actual y otro al nuevo.
// Requiere "Secure email change" prendido en Supabase (Auth → Providers →
// Email) y la plantilla "Change email address" con `{{ .Token }}`, sin link.
// Con un solo código, quien le robara la sesión a alguien cambiaría el mail a
// uno suyo y se quedaría con la cuenta; así, sin acceso al mail actual no se
// puede. Quien perdió ese acceso lo pide por soporte (`admin-actions` →
// `change_user_email`), donde se comprueba con el comprobante de un pago.
//
// `profiles.email` lo sincroniza el trigger `trg_sync_profile_email` sobre
// `auth.users` (migración 20261028020000): la app no puede escribir esa columna.

type Paso = 'pedir' | 'codigos' | 'listo';

const MAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mensajeDeError(m: string | undefined): string {
  if (!m) return 'No se pudo. Probá de nuevo';
  if (/already|registered|exists/i.test(m)) return 'Ese mail ya es de otra cuenta';
  if (/rate|too many|seconds/i.test(m)) return 'Pediste muchos códigos seguidos. Esperá unos minutos y probá de nuevo';
  if (/expired|invalid|token/i.test(m)) return 'El código no es correcto o ya venció';
  return 'No se pudo. Probá de nuevo';
}

export default function CambiarMailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const actual = user?.email ?? '';

  const [paso, setPaso] = useState<Paso>('pedir');
  const [nuevo, setNuevo] = useState('');
  const [codigoActual, setCodigoActual] = useState('');
  const [codigoNuevo, setCodigoNuevo] = useState('');
  // El primer código puede salir bien y el segundo no: no se vuelve a pedir.
  const [actualOk, setActualOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function pedirCodigos() {
    setError(null);
    const mail = nuevo.trim().toLowerCase();
    if (!MAIL_VALIDO.test(mail)) { setError('Escribí un mail válido'); return; }
    if (mail === actual.toLowerCase()) { setError('Ese ya es tu mail'); return; }

    setCargando(true);
    const { error: e } = await supabase.auth.updateUser({ email: mail });
    setCargando(false);
    if (e) { setError(mensajeDeError(e.message)); return; }
    setNuevo(mail);
    setActualOk(false);
    setCodigoActual('');
    setCodigoNuevo('');
    setPaso('codigos');
  }

  async function confirmar() {
    setError(null);
    if ((!actualOk && codigoActual.trim().length < 6) || codigoNuevo.trim().length < 6) {
      setError('Escribí los dos códigos');
      return;
    }
    setCargando(true);
    if (!actualOk) {
      const { error: e1 } = await supabase.auth.verifyOtp({ email: actual, token: codigoActual.trim(), type: 'email_change' });
      if (e1) { setCargando(false); setError(`Código de ${actual}: ${mensajeDeError(e1.message).toLowerCase()}`); return; }
      setActualOk(true);
    }
    const { error: e2 } = await supabase.auth.verifyOtp({ email: nuevo, token: codigoNuevo.trim(), type: 'email_change' });
    if (e2) { setCargando(false); setError(`Código de ${nuevo}: ${mensajeDeError(e2.message).toLowerCase()}`); return; }
    // Trae el usuario con el mail nuevo a la sesión de la app.
    await supabase.auth.refreshSession().catch(() => {});
    setCargando(false);
    setPaso('listo');
  }

  async function sinAcceso() {
    const ok = await escribirnos(
      'No tengo acceso a mi mail',
      `Mail actual: ${actual}\nMail nuevo: ${nuevo}\n\nSi pagaste alguna sesión, adjuntá el comprobante: nos sirve para comprobar que la cuenta es tuya.\n\n`,
    );
    if (!ok) setError(`Escribinos a ${EMAIL_CONTACTO}`);
  }

  return (
    <AppBg>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView style={s.flex} behavior="padding">
          <ScrollView
            contentContainerStyle={s.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {paso === 'pedir' && (
              <>
                <View style={s.headingArea}>
                  <Text style={s.heading}>Cambiar tu mail</Text>
                  <Text style={s.subheading}>
                    Ahora usás {actual}. Te vamos a mandar un código a ese mail y otro al nuevo, para
                    comprobar que los dos son tuyos.
                  </Text>
                </View>
                <View style={s.form}>
                  <TextInput
                    style={s.input}
                    value={nuevo}
                    onChangeText={v => { setNuevo(v); setError(null); }}
                    placeholder="Tu mail nuevo"
                    placeholderTextColor="rgba(135,131,92,0.45)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                  />
                  {error && <Text style={s.serverError}>{error}</Text>}
                  <ScaleCard style={s.btn} onPress={pedirCodigos} activeOpacity={0.85} disabled={cargando}>
                    {cargando
                      ? <ActivityIndicator size="small" color="#F7EFE4" />
                      : <Text style={s.btnText}>Mandarme los códigos</Text>}
                  </ScaleCard>
                  <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
                    <Text style={s.link}>Volver</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {paso === 'codigos' && (
              <>
                <View style={s.headingArea}>
                  <Text style={s.heading}>Escribí los dos códigos</Text>
                  <Text style={s.subheading}>Si no los ves, fijate en spam.</Text>
                </View>
                <View style={s.form}>
                  {!actualOk && (
                    <>
                      <Text style={s.label}>Código que llegó a {actual}</Text>
                      <TextInput
                        style={s.input}
                        value={codigoActual}
                        onChangeText={v => { setCodigoActual(v.replace(/\D/g, '')); setError(null); }}
                        placeholder="Código"
                        placeholderTextColor="rgba(135,131,92,0.45)"
                        keyboardType="number-pad"
                        maxLength={10}
                      />
                    </>
                  )}
                  <Text style={s.label}>Código que llegó a {nuevo}</Text>
                  <TextInput
                    style={s.input}
                    value={codigoNuevo}
                    onChangeText={v => { setCodigoNuevo(v.replace(/\D/g, '')); setError(null); }}
                    placeholder="Código"
                    placeholderTextColor="rgba(135,131,92,0.45)"
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                  {error && <Text style={s.serverError}>{error}</Text>}
                  <ScaleCard style={s.btn} onPress={confirmar} activeOpacity={0.85} disabled={cargando}>
                    {cargando
                      ? <ActivityIndicator size="small" color="#F7EFE4" />
                      : <Text style={s.btnText}>Cambiar mi mail</Text>}
                  </ScaleCard>
                  <TouchableOpacity onPress={() => { setPaso('pedir'); setError(null); }} hitSlop={8}>
                    <Text style={s.link}>Usar otro mail o pedir códigos nuevos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={sinAcceso} hitSlop={8}>
                    <Text style={s.link}>No tengo acceso a {actual}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {paso === 'listo' && (
              <View style={s.headingArea}>
                <Text style={s.heading}>Listo</Text>
                <Text style={s.subheading}>Desde ahora entrás con {nuevo}.</Text>
                <ScaleCard style={s.btn} onPress={() => router.back()} activeOpacity={0.85}>
                  <Text style={s.btnText}>Volver</Text>
                </ScaleCard>
              </View>
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
  label: {
    fontFamily: ViveFonts.regular,
    fontSize: 13,
    color: '#87835C',
    marginTop: 4,
  },
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
  serverError: {
    fontFamily: ViveFonts.regular,
    fontSize: 13,
    color: '#C4553A',
    textAlign: 'center',
  },
  btn: {
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
  btnText: {
    fontFamily: ViveFonts.semibold,
    fontSize: 16,
    color: '#F7EFE4',
    letterSpacing: 0.2,
  },
  link: {
    fontFamily: ViveFonts.regular,
    fontSize: 14,
    color: '#87835C',
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
});
