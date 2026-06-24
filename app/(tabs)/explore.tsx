import { View, Text, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ViveFonts } from '@/constants/theme';
import { AppBg } from '@/components/ui/AppBg';

export default function ExploreScreen() {
  return (
    <AppBg>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Text style={s.title}>Comunidad</Text>
          <Text style={s.sub}>Próximamente.</Text>
        </View>
      </SafeAreaView>
    </AppBg>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 90,
  },
  title: {
    fontFamily: ViveFonts.bold,
    fontSize: 32,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  sub: {
    fontFamily: ViveFonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
  },
});
