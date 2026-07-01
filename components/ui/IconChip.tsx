import { View, StyleSheet } from 'react-native';
import { colors, radii } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
  variant?: 'terracota' | 'forest';
  size?: number;
};

export function IconChip({ children, variant = 'terracota', size = 42 }: Props) {
  const bg = variant === 'terracota' ? colors.tintTerracota : colors.tintForest;
  return (
    <View style={[s.chip, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
