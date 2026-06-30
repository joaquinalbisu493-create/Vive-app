import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppBg } from '@/components/ui/AppBg';
import { ViveColors, ViveFonts } from '@/constants/theme';

export default function IaScreen() {
  const router = useRouter();

  return (
    <AppBg>
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={s.body}>
          <Text style={s.title}>vita IA</Text>
          <Text style={s.subtitle}>Próximamente</Text>
        </View>
      </SafeAreaView>
    </AppBg>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontFamily: ViveFonts.frauncesSerif,
    fontSize: 36,
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  subtitle: {
    fontFamily: ViveFonts.regular,
    fontSize: 16,
    color: 'rgba(255,255,255,0.55)',
  },
});
