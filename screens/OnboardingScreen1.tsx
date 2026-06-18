import { useEffect } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  useFrameCallback,
  withTiming,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Circle as SvgCircle,
  Filter,
  FeGaussianBlur,
} from 'react-native-svg';

// ── Config ────────────────────────────────────────────────────────────────────

const HOLD_MS  = 1300;
const GLOW_R   = 92;
const BLUR_STD = 20;

// Three warm orange tones — close enough to read as one light when merged
const COLORS = ['#FF9A52', '#FFB36B', '#FFC98C'] as const;

// Venn triangle positions relative to centroid (equilateral, D = 78)
const VENN = [
  { x:   0, y: -45 },   // top
  { x: -39, y:  22 },   // bottom-left
  { x:  39, y:  22 },   // bottom-right
] as const;

// Orbital start: same constellation rotated ~60° CW
// Each circle travels its own arc to land in Venn position
const ORBT = [
  { x: -39, y: -22 },
  { x:  39, y: -22 },
  { x:   0, y:  45 },
] as const;

// ── Worklet helpers ───────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

// easeInOutQuint
function eioq(t: number): number {
  'worklet';
  return t < 0.5
    ? 16 * t * t * t * t * t
    : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

// easeInOutQuad
function eiod(t: number): number {
  'worklet';
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ── Animated props for one glow circle ───────────────────────────────────────
// Calling useAnimatedProps 3× with explicit idx avoids hook-in-loop issues.

function useCircleAnimProps(
  sx: number, sy: number,   // orbital start (absolute in SVG)
  vx: number, vy: number,   // venn rest (absolute in SVG)
  cx: number, cy: number,   // canvas centroid (merge target)
  entryP:  SharedValue<number>,
  holdP:   SharedValue<number>,
  revealP: SharedValue<number>,
) {
  return useAnimatedProps(() => {
    const eEntry = eioq(entryP.value);   // 0→1 smooth orbit-in
    const eHold  = eiod(holdP.value);    // 0→1 smooth merge

    // Entry path: orbital start → Venn rest
    const restX = lerp(sx, vx, eEntry);
    const restY = lerp(sy, vy, eEntry);

    // Hold path: current rest position → centroid
    const px = lerp(restX, cx, eHold);
    const py = lerp(restY, cy, eHold);

    // Radius grows 20% during hold for visual intensity
    const r = lerp(GLOW_R, GLOW_R * 1.2, eHold);

    const opacity = 1 - revealP.value;

    return { cx: px, cy: py, r, opacity };
  });
}

const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);

// ── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingScreen1() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Canvas dimensions
  const SVG_W = Math.min(width, 420);
  const SVG_H = 270;
  const CX    = SVG_W / 2;
  const CY    = SVG_H / 2 + 8; // centroid slightly below SVG center

  // Absolute SVG positions derived from centroid
  const orbt = ORBT.map((p) => ({ x: CX + p.x, y: CY + p.y }));
  const venn = VENN.map((p) => ({ x: CX + p.x, y: CY + p.y }));

  // ── Shared values ─────────────────────────────────────────────────────────

  const entryProgress  = useSharedValue(0); // 0→1 on mount (circles orbit in)
  const holdProgress   = useSharedValue(0); // 0→1 while pressing (reversible)
  const revealProgress = useSharedValue(0); // 0→1 on completion (fade out)
  const viveOpacity    = useSharedValue(0); // "vive" fades in on mount
  const hintOpacity    = useSharedValue(0); // hint appears after entry settles
  const isHolding      = useSharedValue(false);
  const hasRevealed    = useSharedValue(false);

  // ── Mount ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    // "vive" appears quickly at the top
    viveOpacity.value = withTiming(1, { duration: 480 });

    // Circles orbit from start positions to Venn (easing handled in worklet)
    entryProgress.value = withTiming(1, { duration: 1500 }, (finished) => {
      if (finished) {
        hintOpacity.value = withTiming(1, { duration: 600 });
      }
    });
  }, []);

  // ── Hold frame callback (UI thread) ──────────────────────────────────────

  function navigateHome() {
    router.replace('/(tabs)');
  }

  useFrameCallback((frame) => {
    if (hasRevealed.value) return;
    const dt = frame.timeSincePreviousFrame ?? 16;

    if (isHolding.value) {
      const next = Math.min(1, holdProgress.value + dt / HOLD_MS);
      holdProgress.value = next;
      if (next >= 1) {
        hasRevealed.value = true;
        revealProgress.value = withTiming(
          1,
          { duration: 680 },
          (done) => { if (done) runOnJS(navigateHome)(); },
        );
      }
    } else {
      // Release: reverse at 1.6× speed for snappy but smooth return
      holdProgress.value = Math.max(0, holdProgress.value - dt / (HOLD_MS * 0.62));
    }
  });

  // ── Animated props (3 circles — hooks called in fixed order) ─────────────

  const p0 = useCircleAnimProps(
    orbt[0].x, orbt[0].y,
    venn[0].x, venn[0].y,
    CX, CY,
    entryProgress, holdProgress, revealProgress,
  );
  const p1 = useCircleAnimProps(
    orbt[1].x, orbt[1].y,
    venn[1].x, venn[1].y,
    CX, CY,
    entryProgress, holdProgress, revealProgress,
  );
  const p2 = useCircleAnimProps(
    orbt[2].x, orbt[2].y,
    venn[2].x, venn[2].y,
    CX, CY,
    entryProgress, holdProgress, revealProgress,
  );

  // ── Animated styles ───────────────────────────────────────────────────────

  // "vive" slides down toward the diagram center during hold
  const viveStyle = useAnimatedStyle(() => {
    const eHold = eiod(holdProgress.value);
    return {
      opacity: viveOpacity.value * (1 - revealProgress.value),
      transform: [{ translateY: lerp(0, 24, eHold) }],
    };
  });

  // hint disappears as soon as hold starts
  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value * Math.max(0, 1 - holdProgress.value * 5),
  }));

  // white overlay fades in during reveal to "clear" the background
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: revealProgress.value,
  }));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Warm cream gradient background */}
      <LinearGradient
        colors={['#FBF3E7', '#F4E2C8']}
        style={StyleSheet.absoluteFill}
      />

      {/* Reveal overlay — cream solid that fades in over the gradient */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.revealOverlay, overlayStyle]}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safe}>
        {/* The whole screen is the hold target */}
        <Pressable
          style={styles.pressable}
          onPressIn={() => {
            isHolding.value = true;
          }}
          onPressOut={() => {
            isHolding.value = false;
          }}
        >
          {/* Wordmark — visible from the first frame */}
          <Animated.Text style={[styles.vive, viveStyle]}>vive</Animated.Text>

          {/* Glow diagram */}
          <Svg
            width={SVG_W}
            height={SVG_H}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          >
            <Defs>
              {/* One radial gradient per circle so colors stay distinct */}
              {COLORS.map((color, i) => (
                <RadialGradient
                  key={i}
                  id={`vg${i}`}
                  cx="50%"
                  cy="50%"
                  r="50%"
                  fx="50%"
                  fy="50%"
                >
                  <Stop offset="0%"   stopColor={color} stopOpacity="0.95" />
                  <Stop offset="50%"  stopColor={color} stopOpacity="0.55" />
                  <Stop offset="100%" stopColor={color} stopOpacity="0"    />
                </RadialGradient>
              ))}

              {/* Single shared blur — one pass, all circles share it */}
              <Filter
                id="glow"
                x="-100%"
                y="-100%"
                width="300%"
                height="300%"
              >
                <FeGaussianBlur stdDeviation={String(BLUR_STD)} />
              </Filter>
            </Defs>

            {/* Circles rendered back-to-front for natural overlap */}
            <AnimatedCircle animatedProps={p0} fill="url(#vg0)" filter="url(#glow)" />
            <AnimatedCircle animatedProps={p1} fill="url(#vg1)" filter="url(#glow)" />
            <AnimatedCircle animatedProps={p2} fill="url(#vg2)" filter="url(#glow)" />
          </Svg>

          {/* Hold hint — appears after circles settle, disappears on press */}
          <Animated.Text style={[styles.hint, hintStyle]}>
            Mantené presionado
          </Animated.Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  vive: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 84,
    color: '#3A1E06',
    letterSpacing: -3.5,
    lineHeight: 90,
    marginBottom: 8,
  },
  hint: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    color: '#9A7455',
    letterSpacing: 0.4,
    marginTop: 20,
  },
  revealOverlay: {
    backgroundColor: '#FBF3E7',
  },
});
