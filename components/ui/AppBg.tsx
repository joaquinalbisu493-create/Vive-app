import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/tokens';

type Props = { children: React.ReactNode };

export function AppBg({ children }: Props) {
  return (
    <LinearGradient
      colors={colors.bgGrad}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={s.root}
    >
      {children}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, width: '100%', height: '100%' },
});
