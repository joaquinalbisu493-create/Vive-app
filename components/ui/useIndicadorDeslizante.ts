import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// La pastilla que marca la opción elegida en un control segmentado (Hoy/Mes,
// lista/tarjetas). En vez de aparecer en la otra opción, se desliza hasta ahí:
// se ve de dónde viene el cambio. Cada opción reporta dónde quedó con
// `alMedir(i)`; la pastilla va como hermana absoluta, debajo de las opciones.
//
// Se anima posición y ancho, que no corren en el hilo nativo: alcanza para
// algo de este tamaño y evita suponer que todas las opciones miden lo mismo.
export function useIndicadorDeslizante(indice: number) {
  const reducedMotion = useReducedMotion();
  const [medidas, setMedidas] = useState<{ x: number; width: number }[]>([]);
  const x = useRef(new Animated.Value(0)).current;
  const ancho = useRef(new Animated.Value(0)).current;
  const ubicado = useRef(false);

  useEffect(() => {
    const m = medidas[indice];
    if (!m) return;
    // La primera vez se ubica sin animar: no tiene de dónde venir.
    if (!ubicado.current || reducedMotion) {
      x.setValue(m.x);
      ancho.setValue(m.width);
      ubicado.current = true;
      return;
    }
    const curva = { duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: false };
    Animated.parallel([
      Animated.timing(x, { toValue: m.x, ...curva }),
      Animated.timing(ancho, { toValue: m.width, ...curva }),
    ]).start();
  }, [indice, medidas, reducedMotion, x, ancho]);

  const alMedir = (i: number) => (e: LayoutChangeEvent) => {
    const { x: mx, width } = e.nativeEvent.layout;
    setMedidas(prev => {
      if (prev[i]?.x === mx && prev[i]?.width === width) return prev;
      const next = [...prev];
      next[i] = { x: mx, width };
      return next;
    });
  };

  return {
    alMedir,
    estiloIndicador: {
      position: 'absolute' as const,
      top: 3,
      bottom: 3,
      left: x,
      width: ancho,
      opacity: medidas[indice] ? 1 : 0,
    },
  };
}
