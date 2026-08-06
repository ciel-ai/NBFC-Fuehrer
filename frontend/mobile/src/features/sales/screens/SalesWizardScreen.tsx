import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { SuccessIcon } from '@/src/shared/components/common/SuccessIcon';
import { scale } from '@/src/core/utils/responsive';
import { getProductConfig } from '@/src/features/sales/config';
import { SalesField } from '@/src/features/sales/components/SalesField';
import { StepProgress } from '@/src/features/sales/components/StepProgress';
import { ReviewSummary } from '@/src/features/sales/components/ReviewSummary';
import { OrnamentList } from '@/src/features/sales/components/OrnamentList';
import type { OrnamentEntry } from '@/src/features/sales/config/ornaments';
import { useSalesDraft } from '@/src/features/sales/hooks/useSalesDraft';
import { useSubmitApplication } from '@/src/features/sales/queries/useSubmitApplication';
import { useSalesStore } from '@/src/store/salesStore';
import type { SalesProduct } from '@/src/entities/salesAgent';

type FormValues = Record<string, unknown>;

function deriveLabel(values: FormValues): string {
  const full = [values.firstName, values.lastName].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (values.customerName) return String(values.customerName);
  if (values.accountHolderName) return String(values.accountHolderName);
  return 'Untitled application';
}

export function SalesWizardScreen({ product }: { product: SalesProduct }) {
  const config = getProductConfig(product);
  const steps = config.steps;
  const total = steps.length;

  const params = useLocalSearchParams<{ draftId?: string }>();
  const { draftId, initialData, initialStep, save, flush } = useSalesDraft(
    product,
    typeof params.draftId === 'string' ? params.draftId : undefined,
  );

  const deleteDraft = useSalesStore((s) => s.deleteDraft);
  const submit = useSubmitApplication(product);

  const [currentStep, setCurrentStep] = useState(() =>
    Math.min(Math.max(initialStep, 0), total - 1),
  );
  const [submitted, setSubmitted] = useState<{ queued: boolean; id?: string } | null>(null);

  // Default every field so RHF tracks it; seed from the resumed draft.
  // `derived` fields are read-only output — they hold no form value.
  const defaultValues = useMemo<FormValues>(() => {
    const dv: FormValues = {};
    for (const step of steps) {
      if ((step.kind ?? 'form') === 'ornaments') dv.ornaments = [];
      for (const field of step.fields ?? []) {
        if (field.type === 'derived') continue;
        dv[field.name] = field.type === 'checkbox' ? false : '';
      }
    }
    return { ...dv, ...initialData };
  }, [steps, initialData]);

  // Dynamic resolver — validates the *current* step's schema only, so each
  // step behaves like its own form while sharing one value store.
  const stepSchemaRef = useRef<z.ZodTypeAny | undefined>(steps[currentStep]?.schema as z.ZodTypeAny | undefined);
  const currentStepRef = useRef(currentStep);

  const resolver = useCallback<Resolver<FormValues>>((values, context, options) => {
    const schema = stepSchemaRef.current;
    if (!schema) return Promise.resolve({ values, errors: {} });
    return zodResolver(schema)(values, context, options);
  }, []);

  const { control, watch, getValues, setValue } = useForm<FormValues>({
    resolver,
    mode: 'onTouched',
    defaultValues,
  });

  // Live values drive both the autosave and the per-step CTA enabled state.
  const values = watch();

  // Debounced autosave on every change.
  useEffect(() => {
    const sub = watch((v) => {
      save(v as FormValues, currentStepRef.current, deriveLabel(v as FormValues));
    });
    return () => sub.unsubscribe();
  }, [watch, save]);

  const step = steps[currentStep];
  const kind = step.kind ?? 'form';
  const formSteps = useMemo(
    () => steps.filter((s) => ['form', 'ornaments'].includes(s.kind ?? 'form')),
    [steps],
  );

  const stepValid = useMemo(() => {
    const schema = step.schema as z.ZodTypeAny | undefined;
    if (!schema) return true;
    return schema.safeParse(values).success;
  }, [step, values]);

  const isLast = currentStep === total - 1;
  const ctaLabel = isLast ? 'Submit Application' : kind === 'review' ? 'Looks Good' : 'Continue';

  const goToStep = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), total - 1);
      stepSchemaRef.current = steps[clamped]?.schema as z.ZodTypeAny | undefined;
      currentStepRef.current = clamped;
      setCurrentStep(clamped);
    },
    [steps, total],
  );

  const handleBack = () => {
    if (currentStep === 0) {
      router.back();
      return;
    }
    flush(getValues(), Math.max(currentStep - 1, 0), deriveLabel(getValues()));
    goToStep(currentStep - 1);
  };

  const handleNext = () => {
    if (!stepValid) return;
    const v = getValues();
    if (isLast) {
      submit.mutate(v, {
        onSuccess: (outcome) => {
          setSubmitted({ queued: outcome.queued, id: outcome.result?.applicationId });
          void deleteDraft(draftId);
        },
      });
      return;
    }
    flush(v, currentStep + 1, deriveLabel(v));
    goToStep(currentStep + 1);
  };

  // ── Success state ─────────────────────────────────────────────────────────
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
              ? 'You’re offline — this application is queued and will sync automatically once you’re back online.'
              : `Application ${submitted.id ?? ''} has been submitted successfully.`}
          </Text>
          <View style={styles.successCta}>
            <Button
              title="Back to Dashboard"
              onPress={() => router.replace('/(sales)')}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title={config.shortTitle} onBack={handleBack} />
      <StepProgress current={currentStep + 1} total={total} title={step.title} accent={config.accent} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step.subtitle ? <Text style={styles.stepSubtitle}>{step.subtitle}</Text> : null}

          {step.note ? (
            <View style={styles.note}>
              <Ionicons name="information-circle-outline" size={scale(18)} color={Colors.primary} />
              <Text style={styles.noteText}>{step.note}</Text>
            </View>
          ) : null}

          {kind === 'review' ? (
            <ReviewSummary steps={formSteps} values={values} />
          ) : kind === 'ornaments' ? (
            <OrnamentList
              rows={(values.ornaments as OrnamentEntry[]) ?? []}
              onChange={(rows) =>
                setValue('ornaments', rows, { shouldValidate: true, shouldTouch: true })
              }
              accent={config.accent}
            />
          ) : (
            (step.fields ?? []).map((field) => (
              <SalesField key={field.name} field={field} control={control} values={values} />
            ))
          )}

          {isLast && submit.isError ? (
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
            title="Back"
            variant="outline"
            fullWidth={false}
            onPress={handleBack}
            style={styles.backBtn}
          />
          <Button
            title={ctaLabel}
            onPress={handleNext}
            disabled={!stepValid}
            loading={submit.isPending}
            style={styles.nextBtn}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    flexGrow: 1,
  },
  stepSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  note: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  noteText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
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
  backBtn: { minWidth: scale(96) },
  nextBtn: { flex: 1 },
  // Success
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
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  successBody: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  successCta: {
    alignSelf: 'stretch',
    marginTop: Spacing.lg,
  },
});
