import React, { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

// Premium fintech splash: a solid royal-blue field that stays empty briefly,
// then reveals the Fuehrer mark — presented as a soft-shadowed white tile so the
// logo keeps its full gradient — with a subtle scale + fade. It then fades out
// to hand off to the Welcome screen rendered underneath.
const SPLASH_COLOR = '#156FE8';
const TILE_SIZE = 132;
const TILE_RADIUS = 30;

const LOGO_DELAY = 1000; // empty blue screen for ~1s
const LOGO_DURATION = 300; // mark: scale 0.8 → 1.0 + fade-in
const HOLD = 600; // let the mark settle
const FADE_OUT = 350; // overlay fades to reveal the Welcome screen

const LOGO_SOURCE = require('../../../../assets/icon.png');

export function AppSplash({ onDone }: { onDone: () => void }) {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    logoOpacity.value = withDelay(
      LOGO_DELAY,
      withTiming(1, { duration: LOGO_DURATION, easing: Easing.out(Easing.cubic) }),
    );
    logoScale.value = withDelay(
      LOGO_DELAY,
      withTiming(1, { duration: LOGO_DURATION, easing: Easing.out(Easing.cubic) }),
    );
    overlayOpacity.value = withDelay(
      LOGO_DELAY + LOGO_DURATION + HOLD,
      withTiming(0, { duration: FADE_OUT, easing: Easing.inOut(Easing.ease) }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const tileStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <StatusBar style="light" />
      <Animated.View style={[styles.tile, tileStyle]}>
        <Image source={LOGO_SOURCE} style={styles.logo} resizeMode="cover" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: TILE_RADIUS,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    // Soft premium drop shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 14,
  },
  logo: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: TILE_RADIUS,
  },
});
