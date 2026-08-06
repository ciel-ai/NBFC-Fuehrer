import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

/* NOTE ON `success`:
   It points at success-brand.json, NOT at success.json.

   success.json is broken: its tick is a white stroke with no coloured disc
   behind it (the layer meant to be that disc has its trim-path pinned at 100,
   so it renders nothing), which leaves the tick invisible on a white screen —
   only the outer ring shows. Its confetti precomp is empty too.

   success-brand.json is payment-success.json rebuilt with three fixes:
     1. recoloured to the app palette — badge `Colors.primary` #1A56DB, halo
        `Colors.primaryLight` #EBF2FF, white tick. Keep those in step with
        theme/colors.ts if the brand blue ever changes.
     2. layer order reversed. Lottie paints layers[0] on TOP, and every asset
        in this folder ships as `soft halo > badge > content`, which puts the
        opaque badge OVER its own icon — they all render as a plain coloured
        disc. Correct stack is content on top, glow at the back.
     3. `"a": 0` (static) corrected to `"a": 1` on three scale properties that
        actually hold keyframe arrays; the renderer reads a static `k` as a
        literal value and gets an array of objects.
   Defects 2 and 3 are present in payment-success / loan-approved /
   application-submitted / failure / payment-failed too — those still render as
   bare discs and need the same treatment. */
const SOURCES = {
  success: require('../../../../assets/success-brand.json'),
  failure: require('../../../../assets/failure.json'),
  pending: require('../../../../assets/pending.json'),
  loading: require('../../../../assets/loading.json'),
  empty: require('../../../../assets/empty-state.json'),
  paymentSuccess: require('../../../../assets/payment-success.json'),
  paymentFailed: require('../../../../assets/payment-failed.json'),
  kycPending: require('../../../../assets/kyc-pending.json'),
  loanApproved: require('../../../../assets/loan-approved.json'),
  applicationSubmitted: require('../../../../assets/application-submitted.json'),
} as const;

export type StatusAnimationName = keyof typeof SOURCES;

/**
 * How long an animation actually runs, in ms, read from the asset itself.
 *
 * Any screen that holds for "as long as the animation takes" must ask for the
 * number rather than hardcode one. A hardcoded 2600ms against a 5s asset is
 * what cut the OTP confirmation in half, and the figure silently goes stale the
 * moment an asset is re-exported at a different length.
 */
export const statusAnimationMs = (name: StatusAnimationName, speed = 1): number => {
  const asset = SOURCES[name] as { ip?: number; op?: number; fr?: number };
  const frames = (asset.op ?? 0) - (asset.ip ?? 0);
  const fps = asset.fr || 30;
  return frames > 0 && speed > 0 ? Math.round((frames / fps / speed) * 1000) : 0;
};

interface StatusAnimationProps {
  name: StatusAnimationName;
  size?: number;
  loop?: boolean;
  speed?: number;
  accessibilityLabel?: string;
  onAnimationComplete?: () => void;
  style?: ViewStyle;
}

export function StatusAnimation({
  name,
  size = 160,
  loop = false,
  speed = 1,
  accessibilityLabel,
  onAnimationComplete,
  style,
}: StatusAnimationProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const notified = useRef(false);

  const notifyOnce = (): void => {
    if (notified.current) return;
    notified.current = true;
    onAnimationComplete?.();
  };

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (alive) setReduceMotion(on);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!reduceMotion) return;
    const timer = setTimeout(notifyOnce, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  /* `progress` must be OMITTED entirely when we want normal playback, not passed
     as undefined. It is a controlled-mode prop: once present, it drives the
     frame and overrides autoPlay. Passing `progress={undefined}` still sends the
     key across the native bridge, where it can coerce to 0 and pin the animation
     on its first frame — which looks exactly like an animation that never plays
     or stops part-way. Only the reduce-motion path wants that control. */
  const controlledProgress = reduceMotion ? { progress: 1 } : {};

  return (
    <View
      style={[styles.container, { width: size, height: size }, style]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? name}
    >
      <LottieView
        source={SOURCES[name]}
        autoPlay={!reduceMotion}
        loop={reduceMotion ? false : loop}
        speed={speed}
        {...controlledProgress}
        onAnimationFinish={notifyOnce}
        resizeMode="contain"
        style={{ width: size, height: size }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});

export default StatusAnimation;
