import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radii, blur } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
};

export function GlassCard({ children, style, intensity = blur.card }: Props) {
  const flat = StyleSheet.flatten([s.base, style]) as ViewStyle;

  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint="light" style={flat}>
        {children}
      </BlurView>
    );
  }
  return (
    <View style={[flat, s.android]}>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  android: {
    backgroundColor: colors.glassBg,
  },
});
