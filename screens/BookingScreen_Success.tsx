import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  Easing,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ViveColors, ViveFonts } from '@/constants/theme';
import { AppBg } from '@/components/ui/AppBg';
import { CoachAvatar } from '@/components/CoachAvatar';
import { localEquivalentLabel } from '@/lib/time';
import { vibrarLogro } from '@/lib/vibracion';
import { sonarReservaConfirmada } from '@/lib/sonido';
import { ScaleCard } from '@/components/ScaleCard';
import { LogoATilde } from '@/components/LogoATilde';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const DAY_NAMES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MONTH_NAMES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return `${DAY_NAMES[date.getDay()]}, ${day} de ${MONTH_NAMES[month - 1]}`;
}

// 🔔 Todo lo que se muestra sale de la reserva en la base, buscada por
// `bookingId` y solo si es de quien mira. Antes salía de los parámetros de la
// ruta, y cualquier link `viveapp://booking-success?instant=1&name=…` armaba una
// "¡Sesión confirmada!" falsa con el nombre, la foto (bajada de cualquier sitio)
// y el horario que quisiera, con sonido y todo (auditoría de seguridad,
// 27/10/2026, corrida 2). Sin reserva propia no se muestra nada y se vuelve a
// Inicio.
type Reserva = {
  coachName: string;
  specialty: string;
  date: string;
  time: string;
  salaId: string;
  confirmada: boolean;
  avatar: string | null;
};

export default function BookingScreen_Success() {
  const router = useRouter();
  const { user } = useAuth();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const [reserva, setReserva] = useState<Reserva | null>(null);

  useEffect(() => {
    if (!user || !bookingId) { router.replace('/(tabs)'); return; }
    let vivo = true;
    (async () => {
      const { data } = await supabase
        .from('bookings')
        .select('user_id, status, coach_id, coach_name, coach_specialty, scheduled_date, scheduled_time, sala_id')
        .eq('id', bookingId)
        .maybeSingle();
      if (!vivo) return;
      if (!data || data.user_id !== user.id || !['pendiente', 'confirmada'].includes(data.status)) {
        router.replace('/(tabs)');
        return;
      }
      const { data: coach } = await supabase
        .from('coaches')
        .select('profiles(avatar_url)')
        .eq('id', data.coach_id)
        .maybeSingle();
      if (!vivo) return;
      setReserva({
        coachName: data.coach_name ?? '',
        specialty: data.coach_specialty ?? '',
        date: data.scheduled_date ?? '',
        time: (data.scheduled_time ?? '').slice(0, 5),
        salaId: data.sala_id ?? '',
        confirmada: data.status === 'confirmada',
        avatar: (coach as any)?.profiles?.avatar_url ?? null,
      });
    })();
    return () => { vivo = false; };
  }, [user, bookingId, router]);

  if (!reserva) {
    return (
      <AppBg>
        <View style={s.cargando}>
          <ActivityIndicator color={ViveColors.primary} />
        </View>
      </AppBg>
    );
  }
  return <Confirmacion reserva={reserva} />;
}

function Confirmacion({ reserva }: { reserva: Reserva }) {
  const router = useRouter();
  const { coachName, specialty, time, salaId } = reserva;
  const dateStr = reserva.date;
  const isInstant = reserva.confirmada;

  // Salir de acá tiene que DESARMAR la pila de la reserva, no apilarse encima.
  //
  // Antes "Ver mi sala" hacía `push` y "Volver a Inicio" `navigate`, y en los
  // dos casos esta pantalla —y todo el embudo que la precede: el perfil del
  // profesional, el calendario, la elección de horario— quedaba viva abajo. El
  // gesto de volver atrás desde la sala te devolvía a "sesión confirmada", una
  // pantalla terminal de algo que ya pasó. Y un paso más atrás te dejaba en el
  // selector de horarios de una reserva que ya está hecha.
  //
  // `booking-success` ya tiene `gestureEnabled: false` en `app/_layout.tsx`, así
  // que no se puede volver DESDE ella; lo que faltaba era no poder volver A ella.
  //
  // `dismissAll()` vuelve a la primera ruta de la pila, que para alguien logueado
  // es `(tabs)` — `app/index.tsx` hace `replace('/(tabs)')` al abrir sesión, así
  // que Inicio es la raíz y no algo apilado. El `canDismiss()` es para el caso
  // sin nada que desapilar, donde `dismissAll()` avisaría por consola.
  const salirDelEmbudo = () => {
    if (router.canDismiss()) router.dismissAll();
    else router.replace('/(tabs)');
  };

  const firstName = coachName.split(' ')[0];
  const formattedDate = formatDate(dateStr);
  const horaLocal = time ? localEquivalentLabel(dateStr, time) : null;

  // Animación: el logo se junta en un círculo y se dibuja la tilde
  // (LogoATilde). El sonido arranca con el movimiento; la vibración y la info
  // de la reserva llegan cuando la tilde termina, que es cuando la reserva "cae".
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    sonarReservaConfirmada();
  }, []);

  function alTerminarTilde() {
    vibrarLogro();
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  return (
    <AppBg>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>

        {/* Centro — ícono + texto */}
        <View style={s.center}>

          <View style={s.checkWrap}>
            <LogoATilde size={96} onTilde={alTerminarTilde} />
          </View>

          <Animated.View style={[s.textBlock, { opacity: contentOpacity }]}>
            {/* Ya no existe el estado "falta confirmar el pago" (sesión 117).
                Esta pantalla mostraba un tilde verde y un botón "Ver mi sala"
                para una reserva sin pagar que se iba a cancelar sola en 30 min:
                el diseño decía que había salido bien y la letra chica decía que
                no. Ahora un pago que no se acredita cancela la reserva en
                `BookingScreen_Confirm` y ni siquiera navega hasta acá. */}
            <Text style={s.title}>
              {isInstant ? '¡Sesión confirmada!' : '¡Reserva enviada!'}
            </Text>
            {/* 25/09/2026: "Ya tenés con quién hablar" es el "no estás solo" de Sere
                dicho donde es literalmente cierto. Solo en la confirmada: en la
                pendiente todavía no lo es. */}
            <Text style={s.subtitle}>
              {isInstant
                ? `Ya tenés con quién hablar. Tu sesión con ${firstName} quedó confirmada.`
                : `Le avisamos a ${firstName}. Tiene 24hs para confirmar tu sesión`}
            </Text>
            <View style={[s.statusBadge, isInstant && s.statusBadgeConfirmed]}>
              <Text style={[s.statusBadgeText, isInstant && s.statusBadgeTextConfirmed]}>
                {isInstant ? 'Confirmada' : 'Pendiente de confirmación'}
              </Text>
            </View>
          </Animated.View>

          {/* Tarjeta resumen */}
          <Animated.View style={[s.card, { opacity: contentOpacity }]}>
            <View style={s.coachRow}>
              <CoachAvatar uri={reserva.avatar} size={44} style={s.avatar} />
              <View style={s.coachInfo}>
                <Text style={s.coachName}>{coachName}</Text>
                {specialty ? <Text style={s.coachSpecialty}>{specialty}</Text> : null}
              </View>
              <MaterialIcons name="verified" size={16} color={ViveColors.accent} />
            </View>

            <View style={s.divider} />

            <View style={s.detailRow}>
              <MaterialIcons name="calendar-today" size={15} color={ViveColors.primary} />
              <Text style={s.detailText}>{formattedDate || '—'}</Text>
            </View>
            <View style={[s.detailRow, { marginBottom: 0 }]}>
              <MaterialIcons name="access-time" size={15} color={ViveColors.primary} />
              {/* Decía "18:00 hs" a secas: desde Madrid se leía como hora de
                  allá. Ahora dice de dónde es y, desde afuera, la equivalencia. */}
              <Text style={s.detailText}>
                {time ? `${time} hs, hora de Argentina` : '—'}
                {horaLocal ? `\n${horaLocal}` : ''}
              </Text>
            </View>
          </Animated.View>

        </View>

        {/* Botones */}
        <Animated.View style={[s.footer, { opacity: contentOpacity }]}>
          <ScaleCard
            style={s.btnPrimary}
            onPress={() => {
              // Desarmar primero y apilar la sala después: queda Inicio → sala,
              // que es donde se llega desde cualquier otro lado de la app.
              salirDelEmbudo();
              router.push({ pathname: '/sala', params: { sala_id: salaId } });
            }}
            activeOpacity={0.85}>
            <Text style={s.btnPrimaryText}>Ver mi sala</Text>
          </ScaleCard>

          <ScaleCard
            style={s.btnSecondary}
            onPress={salirDelEmbudo}
            activeOpacity={0.75}>
            <Text style={s.btnSecondaryText}>Volver a Inicio</Text>
          </ScaleCard>
        </Animated.View>

      </SafeAreaView>
    </AppBg>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  android: { elevation: 4 },
});

const s = StyleSheet.create({
  cargando: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },

  checkWrap: { marginBottom: 28 },

  textBlock: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontFamily: ViveFonts.semibold,
    fontSize: 26,
    color: '#565E32',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: ViveFonts.regular,
    fontSize: 15,
    color: '#87835C',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  statusBadge: {
    backgroundColor: 'rgba(232,197,71,0.18)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  statusBadgeText: {
    fontFamily: ViveFonts.medium,
    fontSize: 13,
    color: ViveColors.primary,
    textAlign: 'center',
  },
  statusBadgeConfirmed: {
    backgroundColor: `${ViveColors.accent}22`,
  },
  statusBadgeTextConfirmed: {
    color: ViveColors.accent,
  },

  card: {
    backgroundColor: 'rgba(255,248,240,0.55)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    padding: 18,
    width: '100%',
    ...cardShadow,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,248,240,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coachInfo: { flex: 1 },
  coachName: {
    fontFamily: ViveFonts.semibold,
    fontSize: 15,
    color: '#565E32',
    marginBottom: 2,
  },
  coachSpecialty: {
    fontFamily: ViveFonts.medium,
    fontSize: 12,
    color: ViveColors.primary,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,248,240,0.48)',
    marginBottom: 14,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  detailText: {
    fontFamily: ViveFonts.medium,
    fontSize: 14,
    color: '#565E32',
  },

  footer: {
    gap: 12,
    paddingBottom: 8,
  },
  btnPrimary: {
    backgroundColor: '#565E32',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontFamily: ViveFonts.semibold,
    fontSize: 16,
    color: '#F7EFE4',
    letterSpacing: 0.2,
  },
  btnSecondary: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.50)',
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontFamily: ViveFonts.semibold,
    fontSize: 16,
    color: '#565E32',
    letterSpacing: 0.2,
  },
});