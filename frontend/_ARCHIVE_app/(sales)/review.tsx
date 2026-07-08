import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { EmptyState } from '@/src/shared/components/common/EmptyState';
import { SuccessIcon } from '@/src/shared/components/common/SuccessIcon';
import { ReviewSummary } from '@/src/features/sales/components/ReviewSummary';
import { getProductConfig } from '@/src/features/sales/config';
import { useSubmitApplication } from '@/src/features/sales/queries/useSubmitApplication';
import { useSalesStore } from '@/src/store/salesStore';
import { scale } from '@/src/core/utils/responsive';
import type { SalesProduct } from '@/src/entities/salesAgent';

function useActiveSalesProduct(): SalesProduct {
  return useSalesStore((s) => s.product ?? s.agent?.product ?? 'cdl');
}

export default function SalesReviewRoute() {
  const params = useLocalSearchParams<{ draftId?: string }>();
  const product = useActiveSalesProduct();
  const config = getProductConfig(product);
  const activeDraftId = useSalesStore((s) => s.activeDraftId);
  const getDraft = useSalesStore((s) => s.getDraft);
  const deleteDraft = useSalesStore((s) => s.deleteDraft);
  const submit = useSubmitApplication(product);
  const [submitted, setSubmitted] = useState<{ queued: boolean; id?: string } | null>(null);

  const draftId = typeof params.draftId === 'string' ? params.draftId : activeDraftId;
  const draft = draftId ? getDraft(draftId) : undefined;
  const formSteps = useMemo(
    () => config.steps.filter((step) => (step.kind ?? 'form') === 'form'),
    [config.steps],
  );

  const handleSubmit = () => {
    if (!draft) return;
    submit.mutate(draft.data, {
      onSuccess: (outcome) => {
        setSubmitted({ queued: outcome.queued, id: outcome.result?.applicationId });
        void deleteDraft(draft.id);
      },
    });
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successWrap}>
          <SuccessIcon size={scale(96)} />
          <Text style={styles.successTitle}>
            {submitted.queued ? 'Saved offline' : 'Application submitted'}
          </Text>
          <Text style={styles.successBody}>
            {submitted.queued
              ? 'This application will sync automatically when connectivity returns.'
              : `Application ${submitted.id ?? ''} has been submitted successfully.`}
          </Text>
          <Button title="Back to Dashboard" onPress={() => router.replace('/(sales)')} />
        </View>
      </SafeAreaView>
    );
  }

  if (!draft) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Review" showBack />
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="document-text-outline"
            title="No draft selected"
            subtitle="Start or resume an application before reviewing it."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Review Application" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{config.shortTitle} summary</Text>
        <Text style={styles.subtitle}>Check the captured details before submitting.</Text>
        <ReviewSummary steps={formSteps} values={draft.data} />
        {submit.isError ? (
          <View style={styles.errorBanner} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={scale(18)} color={Colors.error} />
            <Text style={styles.errorBannerText}>
              Submission failed. Please check your connection and try again.
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          title="Edit"
          variant="outline"
          fullWidth={false}
          style={styles.editButton}
          onPress={() => router.push({ pathname: '/(sales)/new-sale', params: { draftId: draft.id } })}
        />
        <Button
          title="Submit Application"
          loading={submit.isPending}
          style={styles.submitButton}
          onPress={handleSubmit}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: {
    ...Typography.headingMedium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  errorBannerText: {
    ...Typography.caption,
    color: Colors.error,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  editButton: { minWidth: scale(96) },
  submitButton: { flex: 1 },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  successTitle: {
    ...Typography.headingMedium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  successBody: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
