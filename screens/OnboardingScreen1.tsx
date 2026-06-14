import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ViveColors, ViveFonts } from '@/constants/theme';

export default function OnboardingScreen1() {
  const router = useRouter();
  const logoAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(220, [
      Animated.timing(logoAnim, { toValue: 1, duration: 560, useNativeDriver: true }),
      Animated.timing(subtitleAnim, { toValue: 1, duration: 460, useNativeDriver: true }),
      Animated.timing(buttonAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]).start();
  }, []);

  const fadeUp = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.logoRow, fadeUp(logoAnim)]}>
          <Text style={styles.logo}>v</Text>
          <MaterialCommunityIcons name="sprout" size={68} color={ViveColors.primary} style={styles.logoIcon} />
          <Text style={styles.logo}>ve</Text>
        </Animated.View>
        <Animated.Text style={[styles.subtitle, fadeUp(subtitleAnim)]}>
          Tu camino empieza acá
        </Animated.Text>
      </View>

      <Animated.View style={[styles.footer, fadeUp(buttonAnim)]}>
        <TouchableOpacity style={styles.button} activeOpacity={0.85} onPress={() => router.push('/onboarding2')}>
          <Text style={styles.buttonText}>¿Empezamos?</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ViveColors.background,
    paddingHorizontal: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontFamily: ViveFonts.frauncesSerif,
    fontSize: 80,
    color: ViveColors.primary,
    letterSpacing: -3,
    lineHeight: 90,
  },
  logoIcon: {
    marginTop: 3,
  },
  subtitle: {
    fontFamily: ViveFonts.regular,
    fontSize: 18,
    color: ViveColors.text,
    textAlign: 'center',
    letterSpacing: 0.2,
    opacity: 0.85,
  },
  footer: {
    paddingBottom: 16,
  },
  button: {
    backgroundColor: ViveColors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: ViveFonts.semibold,
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
