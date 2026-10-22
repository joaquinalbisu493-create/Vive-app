import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, StatusBar, ScrollView, Platform } from 'react-native';
import Svg, { Defs, Pattern, Circle as SvgCircle, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { ScaleCard } from '@/components/ScaleCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppBg } from '@/components/ui/AppBg';
import { ToolWash } from '@/components/ui/ToolWash';
import { RachaPill } from '@/components/ui/RachaPill';
import { SaveScreen } from '@/components/ui/SaveScreen';
import { ViveFonts } from '@/constants/theme';
import { mixHex } from '@/constants/theme';
import { PASTEL_SALVIA } from '@/constants/tools';
import { PinButton } from '@/components/PinButton';
import { ToolHeader } from '@/components/ui/ToolHeader';
import { usuarioActualId, supabase, registrarEvento } from '@/lib/supabase';
import { recordCompletion } from '@/lib/resourceCompletions';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useRecursoAbierto } from '@/hooks/useRecursoAbierto';
import ParaQueSirve from '@/components/ParaQueSirve';
import { vibrarToque } from '@/lib/vibracion';
import { useIndicadorDeslizante } from '@/components/ui/useIndicadorDeslizante';
import { RellenoElegido } from '@/components/ui/RellenoElegido';

const FOREST       = '#3A4F2A';
const FOREST_SOFT  = '#566245';
const CREAM_LIGHT  = '#F3EEDF';
const CREAM_DEEP   = '#EAE2D0';
const CARD         = '#F7F2E7';

// Gradiente oscuro de la práctica (verde bosque) y gradiente del cierre
// (salvia → verde), derivados del mismo verde/salvia de la herramienta.
const PRACTICE_GRAD = ['#34462A', '#212E18'] as const;
const CIERRE_GRAD: [string, string] = [PASTEL_SALVIA, FOREST];

// Verdes de la barra de ritmo, de más claro a más oscuro siguiendo la
// secuencia. Son el verde del token salvia pero SATURADO: oscurecer el token
// pastel hacia el negro lo volvía gris, así que en vez de eso se interpola entre
// dos salvia-verdes vivos. Genérico para N fases (no fijo a 4).
const BARRA_CLARO  = '#88B58A'; // salvia-verde suave (claro)
const BARRA_OSCURO = FOREST;    // el último tramo = verde del botón "Empezar"
function lerpHex(a: string, b: string, t: number): string {
  const ca = a.replace('#', ''), cb = b.replace('#', '');
  const mix = (i: number) => {
    const x = parseInt(ca.slice(i, i + 2), 16);
    const y = parseInt(cb.slice(i, i + 2), 16);
    return Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  };
  return `#${mix(0)}${mix(2)}${mix(4)}`;
}
function ramaVerdes(n: number): string[] {
  if (n <= 1) return [lerpHex(BARRA_CLARO, BARRA_OSCURO, 0.5)];
  return Array.from({ length: n }, (_, i) => lerpHex(BARRA_CLARO, BARRA_OSCURO, i / (n - 1)));
}

// Un patrón de respiración: sus fases, el tamaño objetivo del orbe en cada una,
// y CUÁNTOS SEGUNDOS dura cada fase. El tiempo es POR FASE porque la
// diafragmática no es pareja (inhala 4, exhala 6).
type Patron = {
  id: string;
  nombre: string;
  titulo: string;
  descripcion: string;
  fases: readonly string[];
  targets: readonly number[];   // scale del orbe (mantené = repite el valor previo)
  segundos: readonly number[];  // duración de cada fase
};

// 🔴 El copy describe la práctica y cuándo usarla, SIN prometer un efecto
// fisiológico: T&C §5 declara que Sere no presta servicios de salud (fix de copy
// del 16/09, ver docs/encuadre-salud-y-responsabilidad.md). No re-introducir
// "calma el sistema nervioso" ni equivalentes.
//
// La descripción ya NO repite los segundos de cada fase: eso ahora lo cuenta la
// barra de ritmo. Queda solo el para qué.
const PATRONES: readonly Patron[] = [
  {
    id: 'caja',
    nombre: 'Cuadrada',
    titulo: 'Cuatro tiempos iguales',
    descripcion: 'Para que la respiración deje de ir apurada.',
    fases:    ['Inhalá', 'Mantené', 'Exhalá', 'Mantené'],
    targets:  [1.0, 1.0, 0.4, 0.4],
    segundos: [4, 4, 4, 4],
  },
  {
    id: 'diafragmatica',
    nombre: 'Diafragmática',
    titulo: 'Respirar hondo, desde la panza',
    descripcion: 'La exhalación, más larga que la inhalación.',
    fases:    ['Inhalá', 'Exhalá'],
    targets:  [1.0, 0.4],
    segundos: [4, 6],
  },
] as const;

const KEEP_AWAKE_TAG = 'vive-respiracion';

// Segundos de sesión tras los cuales la interfaz se retira: a los 30s el patrón
// ya está aprendido y seguir el orbe con los ojos abiertos mantiene la atención
// AFUERA del cuerpo. El orbe sigue animando (si abrís los ojos, la guía está)
// pero el texto se atenúa y la pantalla invita a dejar de mirar.
const RETIRO_S = 30;
const RETIRO_OPACIDAD = 0.22;

// Grano de papel en overlay — mismo lenguaje que SurfaceCard/SaveScreen
// (puntitos pseudo-random vía <Pattern>, sin PNG). Generado una vez.
const GRAIN_TILE = 48;
const GRAIN_DOTS = Array.from({ length: 46 }, () => ({
  x: Math.random() * GRAIN_TILE,
  y: Math.random() * GRAIN_TILE,
  r: 0.35 + Math.random() * 0.75,
  o: 0.12 + Math.random() * 0.4,
}));

function Grain({ opacity = 0.09, tint = '#2E261A' }: { opacity?: number; tint?: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" style={{ opacity }}>
        <Defs>
          <Pattern id="respGrain" patternUnits="userSpaceOnUse" width={GRAIN_TILE} height={GRAIN_TILE}>
            {GRAIN_DOTS.map((d, i) => (
              <SvgCircle key={i} cx={d.x} cy={d.y} r={d.r} fill={tint} fillOpacity={d.o} />
            ))}
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#respGrain)" />
      </Svg>
    </View>
  );
}

// La guía por vibración, para cuando cerrás los ojos. Inhalar es una serie de
// pulsos que se van juntando; exhalar arranca con un solo pulso y después
// silencio; mantener no vibra. Devuelve los ms (desde el inicio de la fase).
function pulsosDeFase(fase: string, segundos: number): number[] {
  if (fase === 'Exhalá') return [0];
  if (fase !== 'Inhalá') return [];
  const pulsos: number[] = [];
  let t = 0;
  let pausa = 550;
  while (t < segundos * 1000 - 150) {
    pulsos.push(t);
    t += pausa;
    pausa = Math.max(180, pausa * 0.82);
  }
  return pulsos;
}

const DURATIONS = [
  { label: '3 min', seconds: 180 },
  { label: '8 min', seconds: 480 },
];

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// Para la línea del cierre: "Tres minutos de respiración cuadrada".
function minutosEnPalabras(secs: number): string {
  const m = Math.round(secs / 60);
  const palabras: Record<number, string> = {
    1: 'Un minuto', 2: 'Dos minutos', 3: 'Tres minutos', 5: 'Cinco minutos', 8: 'Ocho minutos',
  };
  return palabras[m] ?? `${m} minutos`;
}

// Lunes 00:00 de la semana actual, para "N prácticas esta semana".
function inicioSemana(): Date {
  const d = new Date();
  const lunesOffset = (d.getDay() + 6) % 7; // 0 = lunes
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - lunesOffset);
  return d;
}

export default function RespiracionScreen() {
  useRecursoAbierto('respiracion');
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [patronId, setPatronId] = useState<string>(PATRONES[0].id);
  const [duration, setDuration] = useState(DURATIONS[0].seconds);
  const [remaining, setRemaining] = useState(DURATIONS[0].seconds);
  const [breathPhase, setBreathPhase] = useState(0);
  const [faseRestante, setFaseRestante] = useState(PATRONES[0].segundos[0]);
  const [retirada, setRetirada] = useState(false);
  const [practicasSemana, setPracticasSemana] = useState(0);
  const [rachaTick, setRachaTick] = useState(0);

  const patron = PATRONES.find(p => p.id === patronId) ?? PATRONES[0];
  const { alMedir, estiloIndicador } = useIndicadorDeslizante(PATRONES.indexOf(patron));
  // Guarda: al cambiar de patrón, breathPhase puede quedar un frame apuntando a
  // una fase del patrón anterior (cuadrada tiene 4, diafragmática 2).
  const faseIdx = breathPhase % patron.fases.length;
  const verdesBarra = ramaVerdes(patron.fases.length);

  const animScale = useRef(new Animated.Value(1)).current;
  const animTexto = useRef(new Animated.Value(1)).current;
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const userIdRef = useRef<string | null>(null);
  const corriendoRef = useRef(false);
  useEffect(() => { corriendoRef.current = phase === 'running'; }, [phase]);

  useEffect(() => {
    usuarioActualId().then(uid => { userIdRef.current = uid; }).catch(() => {});
  }, []);

  useEffect(() => { setRemaining(duration); }, [duration]);

  // Racha "N prácticas esta semana" desde resource_completions (misma tabla que
  // la racha de Gratitud). Degrada a 0 si no hay cuenta o no hay dato.
  useEffect(() => {
    let vivo = true;
    usuarioActualId().then(uid => {
      if (!uid || !vivo) return;
      supabase
        .from('resource_completions')
        .select('completed_at')
        .eq('user_id', uid)
        .eq('resource_id', 'respiracion')
        .gte('completed_at', inicioSemana().toISOString())
        .then(({ data }) => { if (vivo) setPracticasSemana(data?.length ?? 0); });
    }).catch(() => {});
    return () => { vivo = false; };
  }, [rachaTick]);

  // ── Orbe en REPOSO: late despacio (1 ↔ 1.05, ciclo ~6s), sin texto. No cicla
  // las fases: en preparación no se está respirando todavía. Con "reducir
  // movimiento" queda quieto. ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'idle') return;
    animScale.setValue(1);
    if (reducedMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(animScale, { toValue: 1.05, duration: 3000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(animScale, { toValue: 1.0,  duration: 3000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => { loop.stop(); };
  }, [phase, reducedMotion, animScale]);

  // ── Orbe en PRÁCTICA: el loop fase-por-fase. Crece al inhalar, se mantiene al
  // sostener, se achica al exhalar, con transición de la misma duración que la
  // fase. Con "reducir movimiento" el tamaño cambia sin transición y la fase
  // avanza por setTimeout. Arranca recién al iniciar (dep `phase`). ──────────
  useEffect(() => {
    if (phase !== 'running') return;
    const p = PATRONES.find(x => x.id === patronId) ?? PATRONES[0];
    animScale.setValue(reducedMotion ? p.targets[0] : 0.4);
    setBreathPhase(0);
    let cancelled = false;
    let legTimeout: ReturnType<typeof setTimeout> | null = null;
    let pulsoTimeouts: ReturnType<typeof setTimeout>[] = [];

    // Solo iOS, como el resto de las vibraciones finas de la app.
    function vibrarFase(i: number) {
      if (Platform.OS !== 'ios' || !corriendoRef.current) return;
      const pulsos = pulsosDeFase(p.fases[i], p.segundos[i]);
      const total = pulsos.length;
      pulsoTimeouts = pulsos.map((t, n) => setTimeout(() => {
        if (cancelled || !corriendoRef.current) return;
        const estilo = n >= total * 0.66 && total > 1
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Soft;
        Haptics.impactAsync(estilo).catch(() => {});
      }, t));
    }

    function runLeg(i: number) {
      if (cancelled) return;
      vibrarFase(i);

      const avanzar = () => {
        if (cancelled) return;
        const next = (i + 1) % p.fases.length;
        setBreathPhase(next);
        runLeg(next);
      };

      if (reducedMotion) {
        animScale.setValue(p.targets[i]);
        legTimeout = setTimeout(avanzar, p.segundos[i] * 1000);
        return;
      }

      Animated.timing(animScale, {
        toValue: p.targets[i],
        duration: p.segundos[i] * 1000,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        avanzar();
      });
    }

    runLeg(0);

    return () => {
      cancelled = true;
      if (legTimeout) clearTimeout(legTimeout);
      pulsoTimeouts.forEach(clearTimeout);
      animScale.stopAnimation();
    };
  }, [phase, reducedMotion, patronId, animScale]);

  // Cuenta regresiva de la fase actual (4 → 1). Se reinicia en cada fase.
  useEffect(() => {
    if (phase !== 'running') return;
    setFaseRestante(patron.segundos[faseIdx]);
    const id = setInterval(() => setFaseRestante(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [phase, breathPhase, patronId]); // eslint-disable-line react-hooks/exhaustive-deps

  // La pantalla no se apaga mientras corre: toda la guía es visual.
  useEffect(() => {
    if (phase !== 'running') return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => { deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {}); };
  }, [phase]);

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  // La atenuación del texto guía a los 30s.
  useEffect(() => {
    if (reducedMotion) { animTexto.setValue(retirada ? RETIRO_OPACIDAD : 1); return; }
    Animated.timing(animTexto, {
      toValue: retirada ? RETIRO_OPACIDAD : 1,
      duration: 2500,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [retirada, reducedMotion, animTexto]);

  function handleStart() {
    setPhase('running');
    setRetirada(false);
    animTexto.setValue(1);
    registrarEvento('respiracion_iniciada', { tecnica: patron.nombre, duracion: duration });

    let rem = duration;
    timerRef.current = setInterval(() => {
      rem -= 1;
      setRemaining(rem);
      if (duration - rem >= RETIRO_S) setRetirada(true);
      if (rem <= 0) {
        stopTimer();
        registrarEvento('respiracion_completada', { tecnica: patron.nombre, duracion: duration });
        recordCompletion(userIdRef.current, 'respiracion', duration).catch(() => {});
        setPracticasSemana(n => n + 1); // optimista para el cierre; se re-lee al volver
        setPhase('done');
      }
    }, 1000);
  }

  // Salir por la X: NO muestra cierre (el cierre es para prácticas completadas).
  function abandonar() {
    stopTimer();
    registrarEvento('respiracion_abandonada', {
      tecnica: patron.nombre,
      segundos_completados: duration - remaining,
    });
    setRemaining(duration);
    setRetirada(false);
    setBreathPhase(0);
    setPhase('idle');
  }

  function cerrarCierre() {
    setRachaTick(t => t + 1); // re-lee la racha real
    router.back();
  }

  useEffect(() => () => stopTimer(), []);

  // ── PRÁCTICA: pantalla completa, fondo verde bosque + grano ────────────────
  if (phase === 'running') {
    return (
      <View style={s.practiceFill}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={PRACTICE_GRAD} style={StyleSheet.absoluteFill} />
        <Grain opacity={0.08} tint="#000000" />
        <SafeAreaView style={s.practiceSafe} edges={['top', 'bottom']}>
          <View style={s.practiceTop}>
            <TouchableOpacity onPress={abandonar} hitSlop={10} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Salir">
              <MaterialCommunityIcons name="close" size={26} color={CREAM_LIGHT} />
            </TouchableOpacity>
            <Animated.Text style={[s.practiceTime, { opacity: animTexto }]}>{formatTime(remaining)}</Animated.Text>
          </View>

          <View style={s.practiceCenter}>
            <Animated.View style={[s.orbOuterBig, { transform: [{ scale: animScale }] }]}>
              <View style={s.orbInnerBig}>
                <Text style={s.orbPhase}>{patron.fases[faseIdx]}</Text>
              </View>
            </Animated.View>

            {retirada ? (
              <Text style={s.retiroHint}>Ya encontraste el ritmo. Cerrá los ojos si querés.</Text>
            ) : (
              <Animated.Text style={[s.practiceCount, { opacity: animTexto }]}>{faseRestante}</Animated.Text>
            )}
          </View>

          <View style={{ height: 40 }} />
        </SafeAreaView>
      </View>
    );
  }

  // ── PREPARACIÓN (idle) + CIERRE (SaveScreen modal) ─────────────────────────
  return (
    <AppBg>
      <StatusBar barStyle="dark-content" />
      <ToolWash color={PASTEL_SALVIA} opacity={0.5} />
      <SafeAreaView style={s.safe} edges={['top']}>
        <ToolHeader
          title="Respiración"
          onBack={() => { stopTimer(); router.back(); }}
          right={<PinButton resourceId="respiracion" inline />}
        />
        <View style={s.headerDivider} />

        <ScrollView
          style={s.idleScroll}
          contentContainerStyle={s.idleContent}
          showsVerticalScrollIndicator={false}
        >
          {practicasSemana > 0 && (
            <View style={s.rachaRow}>
              <RachaPill
                icon="meditation"
                label={`${practicasSemana} ${practicasSemana === 1 ? 'práctica' : 'prácticas'} esta semana`}
                color={mixHex(PASTEL_SALVIA, -0.62)}
                tint={mixHex(PASTEL_SALVIA, 0.12)}
              />
            </View>
          )}

          <ParaQueSirve toolId="respiracion" style={{ alignSelf: 'stretch', marginBottom: 6 }} />

          {/* Técnica: control segmentado, fondo cream-deep, activo en card con sombra. */}
          <View style={s.segmented}>
            <Animated.View style={[s.segmentActive, estiloIndicador, s.segmentIndicador]} />
            {PATRONES.map((p, i) => {
              const activo = patronId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onLayout={alMedir(i)}
                  style={s.segment}
                  onPress={() => { if (!activo) vibrarToque(); setPatronId(p.id); }}
                  activeOpacity={0.8}>
                  <Text style={[s.segmentText, activo && s.segmentTextActive]}>{p.nombre}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={s.titleBlock}>
            <Text style={s.subtitle}>{patron.titulo}</Text>
            <Text style={s.description}>{patron.descripcion}</Text>
          </View>

          {/* Barra de ritmo: un tramo por fase, ancho ∝ segundos. Se arma desde
              el array de fases/segundos de la técnica, no fija a 4. */}
          <View style={s.ritmoWrap}>
            <View style={s.ritmoBar}>
              {patron.fases.map((f, i) => (
                <View
                  key={i}
                  style={[s.ritmoSeg, { flex: patron.segundos[i], backgroundColor: verdesBarra[i] }]}>
                  <Text style={s.ritmoSegText}>{patron.segundos[i]}s</Text>
                </View>
              ))}
            </View>
            <View style={s.ritmoLabels}>
              {patron.fases.map((f, i) => (
                <Text key={i} style={[s.ritmoLabel, { flex: patron.segundos[i] }]} numberOfLines={1}>
                  {f.toUpperCase()}
                </Text>
              ))}
            </View>
          </View>

          {/* Duración: etiqueta centrada justo debajo de la barra, y los chips
              centrados debajo. */}
          <View style={s.durationBlock}>
            <Text style={s.durationEyebrow}>DURACIÓN</Text>
            <View style={s.durationChips}>
              {DURATIONS.map(d => {
                const activo = duration === d.seconds;
                return (
                  <TouchableOpacity
                    key={d.seconds}
                    style={[s.durationChip, activo && s.durationChipActive]}
                    onPress={() => { if (!activo) vibrarToque(); setDuration(d.seconds); }}
                    activeOpacity={0.8}>
                    <RellenoElegido activo={activo} radio={14.5} color={FOREST} />
                    <Text style={[s.durationLabel, activo && s.durationLabelActive]}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Orbe en reposo: late despacio, sin texto, grano ~9%. */}
          <View style={s.orbWrap}>
            <Animated.View style={[s.orbOuter, { transform: [{ scale: animScale }] }]}>
              <View style={s.orbInner} />
              <Grain opacity={0.09} />
            </Animated.View>
          </View>

          <ScaleCard style={s.primaryBtn} onPress={handleStart} activeOpacity={0.85} vibrar>
            <MaterialCommunityIcons name="play" size={16} color={CREAM_LIGHT} />
            <Text style={s.primaryBtnText}>Empezar</Text>
          </ScaleCard>
          <Text style={s.footerHint}>
            La pantalla no se apaga mientras dura, y se detiene sola al terminar.
          </Text>
        </ScrollView>
      </SafeAreaView>

      {/* Cierre: la misma pantalla de confirmación que Gratitud y Diario. */}
      <SaveScreen
        visible={phase === 'done'}
        onDone={cerrarCierre}
        doneLabel="Volver"
        gradient={CIERRE_GRAD}
        title="Listo"
        origen="respiracion"
        reduced={reducedMotion}
        racha={practicasSemana > 0 ? {
          icon: 'meditation',
          label: `${practicasSemana} ${practicasSemana === 1 ? 'práctica' : 'prácticas'} esta semana`,
          color: FOREST,
          tint: 'rgba(255,255,255,0.55)',
        } : null}
        recap={
          <>
            <Text style={s.cierreQuote}>
              “{minutosEnPalabras(duration)} de respiración {patron.nombre.toLowerCase()}”
            </Text>
            <Text style={s.cierreInvite}>Quedate un momento, sin apuro, con lo que quede.</Text>
          </>
        }
      />
    </AppBg>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1 },
  headerDivider: { height: 1, backgroundColor: 'rgba(58,79,42,0.08)' },

  idleScroll:  { flex: 1, alignSelf: 'stretch' },
  idleContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, gap: 18 },

  rachaRow: { alignItems: 'center' },

  // Control segmentado de técnica.
  segmented: {
    flexDirection: 'row',
    backgroundColor: CREAM_DEEP,
    borderRadius: 14,
    padding: 4,
    alignSelf: 'stretch',
  },
  segment: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  // La card con sombra del activo es una sola, que se desliza de una técnica
  // a la otra (useIndicadorDeslizante), en vez de saltar.
  segmentActive: {
    borderRadius: 10,
    backgroundColor: CARD,
    shadowColor: '#3A4F2A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 2,
  },
  segmentIndicador: { top: 4, bottom: 4 },
  segmentText:       { fontFamily: ViveFonts.medium, fontSize: 14, color: FOREST_SOFT },
  segmentTextActive: { fontFamily: ViveFonts.semibold, color: FOREST },

  titleBlock:  { alignSelf: 'stretch', gap: 3 },
  subtitle:    { fontFamily: ViveFonts.semibold, fontSize: 22, color: FOREST, textAlign: 'left' },
  description: { fontFamily: ViveFonts.regular, fontSize: 15, color: FOREST_SOFT, textAlign: 'left', lineHeight: 22 },

  // Barra de ritmo.
  ritmoWrap:  { alignSelf: 'stretch', gap: 6 },
  ritmoBar:   { flexDirection: 'row', height: 34, borderRadius: 11, overflow: 'hidden' },
  ritmoSeg:   { alignItems: 'center', justifyContent: 'center' },
  ritmoSegText: { fontFamily: ViveFonts.semibold, fontSize: 12, color: CREAM_LIGHT },
  ritmoLabels: { flexDirection: 'row', marginTop: 2 },
  ritmoLabel:  { fontFamily: ViveFonts.semibold, fontSize: 9.5, letterSpacing: 0.6, color: FOREST_SOFT, textAlign: 'center' },

  // Duración.
  durationBlock:  { alignSelf: 'stretch', alignItems: 'center', gap: 10 },
  durationChips:  { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  durationEyebrow: { fontFamily: ViveFonts.semibold, fontSize: 9.5, letterSpacing: 1.2, color: FOREST_SOFT, textAlign: 'center' },
  durationChip:   { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(63,81,47,0.22)', backgroundColor: 'rgba(255,248,240,0.55)' },
  durationChipActive: { borderColor: FOREST },
  durationLabel:  { fontFamily: ViveFonts.medium, fontSize: 13, color: FOREST_SOFT },
  durationLabelActive: { color: CREAM_LIGHT },

  // Orbe en reposo.
  orbWrap:  { alignSelf: 'center', width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  orbOuter: { width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(74,122,90,0.14)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(74,122,90,0.28)', overflow: 'hidden' },
  orbInner: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(74,122,90,0.30)' },

  primaryBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch', backgroundColor: FOREST, borderRadius: 16, paddingVertical: 15, marginTop: 4, shadowColor: FOREST, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 4 },
  primaryBtnText: { fontFamily: ViveFonts.semibold, fontSize: 16, color: CREAM_LIGHT },
  footerHint:     { fontFamily: ViveFonts.regular, fontSize: 12, color: FOREST_SOFT, textAlign: 'center', marginTop: 2 },

  // Práctica (pantalla oscura).
  practiceFill:   { flex: 1, backgroundColor: PRACTICE_GRAD[1] },
  practiceSafe:   { flex: 1, paddingHorizontal: 28 },
  practiceTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  practiceTime:   { fontFamily: ViveFonts.semibold, fontSize: 17, color: CREAM_LIGHT, letterSpacing: 0.5 },
  practiceCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  orbOuterBig:    { width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(243,238,223,0.10)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(243,238,223,0.22)' },
  orbInnerBig:    { width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(243,238,223,0.16)', alignItems: 'center', justifyContent: 'center' },
  orbPhase:       { fontFamily: ViveFonts.title, fontSize: 24, color: CREAM_LIGHT, letterSpacing: -0.3 },
  practiceCount:  { fontFamily: ViveFonts.bold, fontSize: 40, color: CREAM_LIGHT, letterSpacing: -0.5 },
  retiroHint:     { fontFamily: ViveFonts.regular, fontSize: 14, color: 'rgba(243,238,223,0.75)', textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 },

  // Cierre (recap dentro de SaveScreen).
  cierreQuote:  { fontFamily: ViveFonts.feedback, fontStyle: 'italic', fontSize: 16, color: FOREST, textAlign: 'center', lineHeight: 23 },
  cierreInvite: { fontFamily: ViveFonts.regular, fontSize: 13.5, color: FOREST_SOFT, textAlign: 'center', lineHeight: 20 },
});
