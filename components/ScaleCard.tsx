import { useRef } from 'react';
import { Animated, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { vibrarToque } from '@/lib/vibracion';

const AnimatedPress = Animated.createAnimatedComponent(TouchableOpacity);

type Props = TouchableOpacityProps & {
  /** Un toque de vibración al confirmar el toque. Solo para las acciones que
   *  hacen avanzar algo (empezar, seguir, reservar): si vibra todo, deja de
   *  significar algo. */
  vibrar?: boolean;
};

export function ScaleCard({
  style,
  onPress,
  onPressIn,
  onPressOut,
  activeOpacity = 0.95,
  vibrar = false,
  children,
  ...props
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <AnimatedPress
      {...(props as any)}
      activeOpacity={activeOpacity}
      style={[style, { transform: [{ scale }] }] as any}
      onPress={(e: any) => {
        if (vibrar) vibrarToque();
        onPress?.(e);
      }}
      onPressIn={(e: any) => {
        Animated.spring(scale, {
          toValue: 0.97,
          useNativeDriver: true,
          damping: 20,
          stiffness: 300,
        }).start();
        onPressIn?.(e);
      }}
      onPressOut={(e: any) => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 180,
        }).start();
        onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPress>
  );
}
