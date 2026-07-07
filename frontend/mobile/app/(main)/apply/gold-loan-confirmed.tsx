import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Button } from '@/src/shared/components/common/Button';

function generateRef() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `FHR-GL-${n}`;
}

const REF_ID = generateRef();

const STEPS = [
  { icon: 'diamond' as const, label: 'Visit branch\nwith gold' },
  { icon: 'search' as const, label: 'Gold purity &\nweight assessment' },
  { icon: 'checkmark-circle' as const, label: 'Loan amount\nsanctioned' },
  { icon: 'cash' as const, label: 'Instant\ndisbursal' },
];

export default function GoldLoanConfirmedScreen() {
  const { branchName, branchAddress, date, slot, referenceId, applicationId } = useLocalSearchParams<{
    branchName: string;
    branchAddress: string;
    date: string;
    slot: string;
    referenceId?: string;
    applicationId?: string;
  }>();

  const circleScale = useSharedValue(0);
  const circleOpacity = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(24);

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
    circleOpacity.value = withTiming(1, { duration: 300 });
    circleScale.value = withSpring(1, { damping: 8, stiffness: 120 });
    checkScale.value = withDelay(
      250,
      withSequence(
        withSpring(1.2, { damping: 5, stiffness: 250 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      )
    );
    cardOpacity.value = withDelay(450, withTiming(1, { duration: 400 }));
    cardTranslateY.value = withDelay(450, withSpring(0, { damping: 14, stiffness: 120 }));
  }, []);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Success icon */}
        <Animated.View style={[styles.iconOuter, circleStyle]}>
          <Animated.View style={[styles.iconInner, checkStyle]}>
            <Ionicons name="checkmark" size={48} color={Colors.textWhite} />
          </Animated.View>
        </Animated.View>

        <Text style={styles.title}>Appointment{'\n'}Confirmed!</Text>
        <Text style={styles.subtitle}>
          Your gold loan branch visit is booked. We look forward to seeing you.
        </Text>

        {/* Appointment card */}
        <Animated.View style={[styles.apptCard, Shadow.medium, cardStyle]}>
          <View style={styles.apptHeader}>
            <Ionicons name="calendar" size={16} color={Colors.primary} />
            <Text style={styles.apptHeaderText}>Appointment Details</Text>
          </View>
          <View style={styles.apptDivider} />

          <View style={styles.apptRow}>
            <Text style={styles.apptLabel}>Reference ID</Text>
            <Text style={styles.refId}>{referenceId ?? REF_ID}</Text>
          </View>
          <View style={styles.apptRow}>
            <Text style={styles.apptLabel}>Branch</Text>
            <Text style={styles.apptValue} numberOfLines={2}>{branchName ?? 'Fuehrer Branch'}</Text>
          </View>
          <View style={styles.apptRow}>
            <Text style={styles.apptLabel}>Address</Text>
            <Text style={styles.apptValue} numberOfLines={2}>{branchAddress ?? ''}</Text>
          </View>
          <View style={styles.apptRow}>
            <Text style={styles.apptLabel}>Date</Text>
            <Text style={styles.apptValue}>{date ?? ''}</Text>
          </View>
          <View style={styles.apptRow}>
            <Text style={styles.apptLabel}>Time Slot</Text>
            <Text style={styles.apptValue}>{slot ?? ''}</Text>
          </View>
          <View style={styles.apptDivider} />
          <View style={styles.notifRow}>
            <Ionicons name="notifications" size={14} color={Colors.success} />
            <Text style={styles.notifText}>
              SMS & push notification sent with appointment details.
            </Text>
          </View>
        </Animated.View>

        {/* Process stepper */}
        <Animated.View style={[styles.stepperCard, cardStyle]}>
          <Text style={styles.stepperTitle}>What happens next</Text>
          <View style={styles.stepperRow}>
            {STEPS.map((s, i) => (
              <View key={i} style={styles.stepItem}>
                <View style={[styles.stepCircle, i === 0 && styles.stepCircleActive]}>
                  <Ionicons name={s.icon} size={16} color={i === 0 ? Colors.textWhite : Colors.textDisabled} />
                </View>
                {i < STEPS.length - 1 && <View style={styles.stepLine} />}
                <Text style={[styles.stepLabel, i === 0 && styles.stepLabelActive]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Action buttons */}
        <Animated.View style={[styles.actionsCard, cardStyle]}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Alert.alert('Calendar', 'Appointment added to your calendar.')}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionText}>Add to Calendar</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Alert.alert('Directions', 'Opening maps for directions.')}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="navigate-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionText}>Get Directions</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
<<<<<<< HEAD
          title="View Appraisal Result"
          onPress={() =>
            router.replace({
              pathname: '/(main)/apply/gold-loan-appraisal-result',
              params: {
                applicationId: applicationId ?? referenceId ?? REF_ID,
              },
            })
          }
=======
          title="Track from My Loans"
          onPress={() => router.replace('/(main)/(tabs)/loans')}
>>>>>>> origin/main
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },

  iconOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: 26,
    color: Colors.primary,
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },

  apptCard: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  apptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: Spacing.md,
    backgroundColor: Colors.primaryLight,
  },
  apptHeaderText: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.primary },
  apptDivider: { height: 1, backgroundColor: Colors.border },
  apptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  apptLabel: { ...Typography.body, color: Colors.textSecondary, flexShrink: 0 },
  apptValue: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.textPrimary, textAlign: 'right', flex: 1 },
  refId: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.primary, letterSpacing: 1 },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: Spacing.md,
    backgroundColor: Colors.successLight,
  },
  notifText: { flex: 1, fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.success, lineHeight: 16 },

  stepperCard: {
    width: '100%',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepperTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepCircleActive: { backgroundColor: Colors.success },
  stepLine: {
    position: 'absolute',
    top: 17,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: Colors.border,
    zIndex: -1,
  },
  stepLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textDisabled,
    textAlign: 'center',
    lineHeight: 14,
  },
  stepLabelActive: {
    fontFamily: FontFamily.semiBold,
    color: Colors.success,
  },

  actionsCard: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  actionDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 68 },

  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});
