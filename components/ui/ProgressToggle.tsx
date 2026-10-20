import { TouchableOpacity, View, Text, StyleSheet, Animated } from 'react-native';
import { useIndicadorDeslizante } from '@/components/ui/useIndicadorDeslizante';
import { vibrarToque } from '@/lib/vibracion';
import { ViveFonts } from '@/constants/theme';
import { colors } from '@/theme/tokens';

type Tab = 'hoy' | 'mes';

type Props = {
  value: Tab;
  onChange: (v: Tab) => void;
};

const TABS: Tab[] = ['hoy', 'mes'];

export function ProgressToggle({ value, onChange }: Props) {
  const { alMedir, estiloIndicador } = useIndicadorDeslizante(TABS.indexOf(value));
  return (
    <View style={s.wrap}>
      <Animated.View style={[s.indicador, estiloIndicador]} />
      {TABS.map((t, i) => (
        <TouchableOpacity
          key={t}
          style={s.btn}
          onLayout={alMedir(i)}
          onPress={() => { if (t !== value) vibrarToque(); onChange(t); }}
          activeOpacity={0.8}
        >
          <Text style={[s.text, value === t && s.textActive]}>
            {t === 'hoy' ? 'Hoy' : 'Mes'}
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 3,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
  },
  indicador: { borderRadius: 16, backgroundColor: colors.pillActiveBg },
  text: {
    fontFamily: ViveFonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  textActive: {
    color: colors.pillActiveText,
  },
});
