import React, { useCallback, useEffect } from 'react';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { Colors } from '@/src/core/theme/colors';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Button } from '@/src/shared/components/common/Button';

function generateRef() {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `FHR-2024-${n.toString().padStart(5, '0')}`;
}

const REF_NUMBER = generateRef();

export default function ApplicationSubmittedScreen() {
  const { productName, loanAmount } = useLocalSearchParams<{
    productName: string;
    loanAmount: string;
  }>();

  // Animations
  const circleScale = useSharedValue(0);
  const circleOpacity = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);

  // Confetti particles
  const confettiOpacity = useSharedValue(0);
  const confettiTranslateY = useSharedValue(-20);

  const circleStyle = useAnimatedStyle(() => ({
    opacity: circleOpacity.value,
    transform: [{ scale: circleScale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const confettiStyle = useAnimatedStyle(() => ({
    opacity: confettiOpacity.value,
    transform: [{ translateY: confettiTranslateY.value }],
  }));

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => true
      );
      return () => subscription.remove();
    }, [])
  );

  useEffect(() => {
    // Circle burst in
    circleOpacity.value = withTiming(1, { duration: 300 });
    circleScale.value = withSpring(1, { damping: 8, stiffness: 120 });

    // Check pop
    checkScale.value = withDelay(
      250,
      withSequence(
        withSpring(1.25, { damping: 5, stiffness: 250 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      )
    );

    // Confetti drift
    confettiOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    confettiTranslateY.value = withDelay(300, withSpring(0, { damping: 12, stiffness: 80 }));

    // Card slide up
    cardOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
    cardTranslateY.value = withDelay(500, withSpring(0, { damping: 14, stiffness: 120 }));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {/* Confetti strip */}
      <Animated.View style={[styles.confettiRow, confettiStyle]}>
        {['🎉', '✨', '🎊', '⭐', '🎈', '✨', '🎉'].map((e, i) => (
          <Text key={i} style={styles.confettiEmoji}>{e}</Text>
        ))}
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Success icon */}
        <Animated.View style={[styles.iconOuter, circleStyle]}>
          <Animated.View style={[styles.iconInner, checkStyle]}>
            <Ionicons name="checkmark" size={52} color={Colors.textWhite} />
          </Animated.View>
        </Animated.View>

        <Text style={styles.title}>Application{'\n'}Submitted!</Text>
        <Text style={styles.subtitle}>
          Your loan application for{' '}
          <Text style={styles.highlight}>{productName ?? 'product'}</Text>
          {' '}has been received and is under review.
        </Text>

        {/* Reference card */}
        <Animated.View style={[styles.refCard, Shadow.medium, cardStyle]}>
          <View style={styles.refHeader}>
            <Ionicons name="document-text" size={18} color={Colors.primary} />
            <Text style={styles.refHeaderText}>Application Reference</Text>
          </View>
          <Text style={styles.refNumber}>{REF_NUMBER}</Text>

          <View style={styles.refDivider} />

          <View style={styles.refRow}>
            <Text style={styles.refLabel}>Loan Amount</Text>
            <Text style={styles.refValue}>
              ₹{parseInt(loanAmount ?? '0').toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.refRow}>
            <Text style={styles.refLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Under Review</Text>
            </View>
          </View>
          <View style={styles.refRow}>
            <Text style={styles.refLabel}>Estimated Decision</Text>
            <Text style={styles.refValue}>2 – 4 business days</Text>
          </View>
        </Animated.View>

        {/* Timeline */}
        <Animated.View style={[styles.timeline, cardStyle]}>
          {[
            { icon: 'checkmark-circle' as const, text: 'Application submitted', done: true },
            { icon: 'shield-checkmark' as const, text: 'Credit team review', done: false },
            { icon: 'cash' as const, text: 'Finance & disbursal', done: false },
            { icon: 'thumbs-up' as const, text: 'Loan active — EMI begins', done: false },
          ].map((step, i) => (
            <View key={i} style={styles.timelineRow}>
              <View style={[styles.timelineIcon, step.done && styles.timelineIconDone]}>
                <Ionicons
                  name={step.icon}
                  size={14}
                  color={step.done ? Colors.textWhite : Colors.textDisabled}
                />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineText, step.done && styles.timelineTextDone]}>
                  {step.text}
                </Text>
              </View>
              {i < 3 && <View style={[styles.timelineLine, step.done && styles.timelineLineDone]} />}
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      {/* CTAs */}
      <Animated.View style={[styles.footer, cardStyle]}>
        {__DEV__ && (
          <View style={styles.debugBox}>
            <View style={styles.debugHeader}>
              <Ionicons name="construct-outline" size={14} color={Colors.goldDark} />
              <Text style={styles.debugTitle}>DEV · Simulate Decision</Text>
            </View>
            <View style={styles.debugRow}>
              <TouchableOpacity
                style={[styles.debugBtn, styles.debugBtnApprove]}
                onPress={() =>
                  router.replace({
                    pathname: '/(main)/apply/loan-approved',
                    params: {
                      amount: `₹${parseInt(loanAmount ?? '500000').toLocaleString('en-IN')}`,
                      loanType: productName ?? 'Consumer Durable Loan',
                    },
                  })
                }
              >
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <Text style={[styles.debugBtnText, { color: Colors.success }]}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.debugBtn, styles.debugBtnStatus]}
                onPress={() => router.push('/(main)/loan-detail/status')}
              >
                <Ionicons name="list-outline" size={14} color={Colors.primary} />
                <Text style={[styles.debugBtnText, { color: Colors.primary }]}>Status</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <Button
          title="Track Application"
          onPress={() => router.replace('/(main)/(tabs)/loans')}
        />
        <TouchableOpacity
          style={styles.homeLink}
          onPress={() => router.replace('/(main)/(tabs)/home')}
        >
          <Ionicons name="home-outline" size={16} color={Colors.primary} />
          <Text style={styles.homeLinkText}>Back to Home</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  confettiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  confettiEmoji: { fontSize: FontSize.xl },

  scrollView: { flex: 1 },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },

  /* Success icon */
  iconOuter: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['4xl'],
    color: Colors.primary,
    textAlign: 'center',
    lineHeight: 36,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
  },
  highlight: {
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },

  /* Reference card */
  refCard: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  refHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  refHeaderText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refNumber: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  refDivider: { height: 1, backgroundColor: Colors.border, marginBottom: Spacing.md },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  refLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  refValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gold,
  },
  statusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.goldDark,
  },

  /* Timeline */
  timeline: {
    width: '100%',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    position: 'relative',
    paddingBottom: 12,
  },
  timelineIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    flexShrink: 0,
  },
  timelineIconDone: { backgroundColor: Colors.success },
  timelineContent: { flex: 1 },
  timelineText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textDisabled,
  },
  timelineTextDone: {
    fontFamily: FontFamily.semiBold,
    color: Colors.success,
  },
  timelineLine: {
    position: 'absolute',
    left: 13,
    top: 28,
    width: 2,
    height: 12,
    backgroundColor: Colors.border,
  },
  timelineLineDone: { backgroundColor: Colors.success },

  /* Footer */
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  homeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
  },
  homeLinkText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.primary,
  },

  /* Debug */
  debugBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.gold,
    backgroundColor: Colors.goldLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  debugTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.goldDark,
    letterSpacing: 0.8,
  },
  debugRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  debugBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    backgroundColor: Colors.background,
  },
  debugBtnApprove: { borderColor: Colors.success },
  debugBtnStatus: { borderColor: Colors.primary },
  debugBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
  },
});
