import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { ViveColors } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// El relleno de lo que está elegido (un día, un horario). En vez de cambiar de
// color de golpe, crece desde el centro y se asienta: se siente que lo tocaste
// vos, no que la pantalla saltó. Va como primer hijo de un botón, así el texto
// queda encima. Sin rebote a propósito.
export function RellenoElegido({ activo, radio }: { activo: boolean; radio: number }) {
  const reducedMotion = useReducedMotion();
  const valor = useRef(new Animated.Value(activo ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) { valor.setValue(activo ? 1 : 0); return; }
    Animated.timing(valor, {
      toValue: activo ? 1 : 0,
      duration: activo ? 220 : 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activo, reducedMotion, valor]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: radio,
          backgroundColor: ViveColors.primary,
          opacity: valor,
          transform: [{ scale: valor.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
        },
      ]}
    />
  );
}
