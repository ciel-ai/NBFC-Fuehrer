import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { BorderRadius, Shadow, Spacing } from '@/src/core/theme/spacing';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { scale } from '@/src/core/utils/responsive';
import { Button } from '@/src/shared/components/common/Button';
import { LoadingSpinner } from '@/src/shared/components/common/LoadingSpinner';
import { StatusAnimation, StatusAnimationName } from '@/src/shared/components/common/StatusAnimation';

export type AppStateKind =
  | 'empty'
  | 'loading'
  | 'error'
  | 'offline'
  | 'slowNetwork'
  | 'noSearchResults'
  | 'permissionDenied'
  | 'sessionExpired'
  | 'validation'
  | 'success';

interface AppStateCopy {
  title: string;
  message: string;
  animation?: StatusAnimationName;
  icon?: keyof typeof Ionicons.glyphMap;
  tone: 'neutral' | 'primary' | 'warning' | 'error' | 'success';
}

const COPY: Record<AppStateKind, AppStateCopy> = {
  empty: {
    title: 'Nothing here yet',
    message: 'When there is activity, it will appear here.',
    animation: 'empty',
    tone: 'neutral',
  },
  loading: {
    title: 'Loading',
    message: 'Please wait while we get the latest information.',
    animation: 'loading',
    tone: 'primary',
  },
  error: {
    title: 'Something went wrong',
    message: 'We could not load the data. Please try again.',
    animation: 'failure',
    tone: 'error',
  },
  offline: {
    title: 'No internet connection',
    message: 'Check your connection. We will keep your work safe where offline saving is supported.',
    icon: 'cloud-offline-outline',
    tone: 'warning',
  },
  slowNetwork: {
    title: 'Slow network',
    message: 'This is taking longer than usual. You can wait, retry, or continue later.',
    animation: 'loading',
    tone: 'warning',
  },
  noSearchResults: {
    title: 'No results found',
    message: 'Try a different name, number, or filter.',
    animation: 'empty',
    tone: 'neutral',
  },
  permissionDenied: {
    title: 'Permission denied',
    message: 'Your account does not have access to this action or screen.',
    icon: 'lock-closed-outline',
    tone: 'error',
  },
  sessionExpired: {
    title: 'Session expired',
    message: 'For your security, please sign in again.',
    icon: 'time-outline',
    tone: 'warning',
  },
  validation: {
    title: 'Check the highlighted fields',
    message: 'Some details need to be corrected before you continue.',
    icon: 'alert-circle-outline',
    tone: 'error',
  },
  success: {
    title: 'Success',
    message: 'Your request has been completed.',
    animation: 'success',
    tone: 'success',
  },
};

interface AppStateViewProps {
  state: AppStateKind;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
  style?: ViewStyle;
}

export function AppStateView({
  state,
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
  style,
}: AppStateViewProps) {
  const copy = COPY[state];
  const tone = toneStyles[copy.tone];
  const finalTitle = title ?? copy.title;
  const finalMessage = message ?? copy.message;

  return (
    <View
      style={[styles.container, compact && styles.compact, style]}
      accessibilityLiveRegion={state === 'loading' ? 'polite' : 'assertive'}
      accessible
      accessibilityLabel={[finalTitle, finalMessage].filter(Boolean).join('. ')}
    >
      <View style={styles.visualSlot}>
        {copy.animation ? (
          <StatusAnimation
            name={copy.animation}
            size={compact ? scale(88) : scale(124)}
            loop={state === 'loading' || state === 'slowNetwork'}
            accessibilityLabel={finalTitle}
          />
        ) : state === 'loading' ? (
          <LoadingSpinner size={compact ? scale(52) : scale(72)} color={tone.fg} />
        ) : (
          <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
            <Ionicons name={copy.icon ?? 'information-circle-outline'} size={scale(40)} color={tone.fg} />
          </View>
        )}
      </View>

      <Text style={styles.title}>{finalTitle}</Text>
      <Text style={styles.message}>{finalMessage}</Text>

      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant={copy.tone === 'error' ? 'outline' : 'primary'}
          fullWidth={!compact}
          style={styles.primaryAction}
        />
      ) : null}

      {secondaryActionLabel && onSecondaryAction ? (
        <Button
          title={secondaryActionLabel}
          onPress={onSecondaryAction}
          variant="ghost"
          fullWidth={!compact}
        />
      ) : null}
    </View>
  );
}

const toneStyles = {
  neutral: { bg: Colors.backgroundLight, fg: Colors.textSecondary },
  primary: { bg: Colors.primaryLight, fg: Colors.primary },
  warning: { bg: Colors.goldLight, fg: Colors.goldDark },
  error: { bg: Colors.errorLight, fg: Colors.error },
  success: { bg: Colors.successLight, fg: Colors.success },
} as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  compact: {
    flex: 0,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow.small,
  },
  visualSlot: {
    minHeight: scale(112),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  iconWrap: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(48),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  message: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  primaryAction: {
    marginTop: Spacing.lg,
  },
});

export default AppStateView;
