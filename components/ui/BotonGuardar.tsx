import { useEffect, useRef } from 'react';
import { Animated, Easing, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { vibrarGuardado } from '@/lib/vibracion';

// El botón de guardar, fijar o marcar como favorito. Cuando lo que tocaste
// queda guardado, el ícono late una vez (crece apenas y se asienta, sin rebote)
// y el teléfono hace el pulso de "guardado". Al quitarlo no hace nada: sacar
// algo no se festeja.
//
// Reacciona al cambio de `activo` y no al toque, porque el toque no siempre
// guarda (te pide entrar, o ya tenés el máximo fijado). Y solo si el cambio
// llega justo después de un toque: cuando la pantalla carga lo que ya tenías
// guardado, no late.
export function BotonGuardar({
  activo,
  onPress,
  children,
  ...props
}: TouchableOpacityProps & { activo: boolean }) {
  const reducedMotion = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;
  const tocadoEn = useRef(0);
  const previo = useRef(activo);

  useEffect(() => {
    // Margen amplio: hay pantallas que esperan a la red antes de marcarlo.
    const recienTocado = Date.now() - tocadoEn.current < 4000;
    if (activo && !previo.current && recienTocado) {
      tocadoEn.current = 0;
      vibrarGuardado();
      if (!reducedMotion) {
        Animated.sequence([
          Animated.timing(escala, { toValue: 1.2, duration: 110, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(escala, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      }
    }
    previo.current = activo;
  }, [activo, reducedMotion, escala]);

  return (
    <TouchableOpacity
      {...props}
      onPress={(e) => {
        tocadoEn.current = Date.now();
        onPress?.(e);
      }}
    >
      <Animated.View style={{ transform: [{ scale: escala }] }}>{children}</Animated.View>
    </TouchableOpacity>
  );
}
