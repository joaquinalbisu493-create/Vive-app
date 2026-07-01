import { Text, StyleSheet, TextStyle } from 'react-native';
import { ViveFonts } from '@/constants/theme';
import { colors } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
  style?: TextStyle;
};

export function SectionTitle({ children, style }: Props) {
  return <Text style={[s.title, style]}>{children}</Text>;
}

const s = StyleSheet.create({
  title: {
    fontFamily: ViveFonts.semibold,
    fontSize: 15,
    color: colors.textPrimary,
  },
});
