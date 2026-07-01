import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { ViveFonts } from '@/constants/theme';
import { colors, radii } from '@/theme/tokens';

type Props<T extends string> = {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
};

export function SegmentedPill<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={s.wrap}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[s.btn, value === opt.value && s.btnActive]}
          onPress={() => onChange(opt.value)}
          activeOpacity={0.8}
        >
          <Text style={[s.text, value === opt.value && s.textActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.pillBg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 3,
  },
  btn: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill - 4,
    alignItems: 'center',
  },
  btnActive: { backgroundColor: colors.pillActiveBg },
  text: {
    fontFamily: ViveFonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  textActive: {
    color: colors.pillActiveText,
    fontFamily: ViveFonts.semibold,
  },
});
