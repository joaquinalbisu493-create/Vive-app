import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ViveColors } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// La confirmación de una reserva: el isotipo de Sere (los tres círculos de
// `VitaMark`) se junta en uno solo, ese uno se llena y adentro se dibuja la
// tilde. Es la misma idea del onboarding "tres en uno", en corto: en vez de la
// tilde de cualquier app, la marca misma dice "listo". Dura menos de un
// segundo; la info de la reserva entra recién cuando la tilde termina
// (`onTilde`), que es también el instante de la vibración.
//
// Se anima con el Animated de RN sobre props de SVG (como MoodCheckIn), que no
// corre en el hilo nativo: alcanza para algo de este tamaño y esta duración.

const CirculoAnimado = Animated.createAnimatedComponent(Circle);
const TrazoAnimado = Animated.createAnimatedComponent(Path);

// Geometría de VitaMark en su viewBox de 100.
const R = 26;
const CENTROS = [
  { cx: 50, cy: 34 },
  { cx: 29.5, cy: 66 },
  { cx: 70.5, cy: 66 },
];
const R_JUNTOS = 48;
const TILDE = 'M30 51 L44 64 L70 37';
const TILDE_LARGO = 57;

const TRAZO_LOGO = ViveColors.text;
const DISCO = ViveColors.accent;
const TILDE_COLOR = '#F7EFE4';

export function LogoATilde({ size = 96, onTilde }: { size?: number; onTilde?: () => void }) {
  const reducedMotion = useReducedMotion();
  const aparece = useRef(new Animated.Value(0)).current;
  const junta = useRef(new Animated.Value(0)).current;
  const llena = useRef(new Animated.Value(0)).current;
  const dibuja = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      aparece.setValue(1); junta.setValue(1); llena.setValue(1); dibuja.setValue(1);
      onTilde?.();
      return;
    }
    const js = { useNativeDriver: false } as const;
    Animated.sequence([
      Animated.timing(aparece, { toValue: 1, duration: 140, easing: Easing.out(Easing.cubic), ...js }),
      Animated.parallel([
        Animated.timing(junta, { toValue: 1, duration: 380, easing: Easing.inOut(Easing.cubic), ...js }),
        // El disco se llena sobre el final del movimiento, no después: así
        // se lee como un solo gesto.
        Animated.sequence([
          Animated.delay(240),
          Animated.timing(llena, { toValue: 1, duration: 160, easing: Easing.out(Easing.cubic), ...js }),
        ]),
      ]),
      Animated.timing(dibuja, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), ...js }),
    ]).start(({ finished }) => { if (finished) onTilde?.(); });
    // Solo al montarse: es el instante en que la reserva cae.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const escala = aparece.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <Animated.View style={{ width: size, height: size, opacity: aparece, transform: [{ scale: escala }] }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <CirculoAnimado cx="50" cy="50" r="50" fill={DISCO} opacity={llena} />
        {CENTROS.map((c, i) => (
          <CirculoAnimado
            key={i}
            cx={junta.interpolate({ inputRange: [0, 1], outputRange: [c.cx, 50] })}
            cy={junta.interpolate({ inputRange: [0, 1], outputRange: [c.cy, 50] })}
            r={junta.interpolate({ inputRange: [0, 1], outputRange: [R, R_JUNTOS] })}
            stroke={TRAZO_LOGO}
            strokeWidth={4}
            fill="none"
            opacity={llena.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })}
          />
        ))}
        <TrazoAnimado
          d={TILDE}
          stroke={TILDE_COLOR}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={`${TILDE_LARGO}`}
          strokeDashoffset={dibuja.interpolate({ inputRange: [0, 1], outputRange: [TILDE_LARGO, 0] })}
        />
      </Svg>
    </Animated.View>
  );
}
