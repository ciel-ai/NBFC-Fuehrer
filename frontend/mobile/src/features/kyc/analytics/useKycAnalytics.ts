import { logger } from '@/src/core/logger/logger';
import { useCallback, useRef } from 'react';
import { KycAnalyticsEvent, KycAnalyticsPayload } from '@/src/entities/analytics';
import { KycStep } from '@/src/entities/kyc';

// Simple abstraction for analytics provider
const trackEvent = (event: KycAnalyticsEvent, payload?: KycAnalyticsPayload) => {
  if (__DEV__) {
    logger.debug(`[KYC Analytics] ${event}`, payload || {});
  }
  // In production, this would send to Mixpanel, Amplitude, etc.
};

export function useKycAnalytics() {
  const stepStartTime = useRef<number>(Date.now());

  const trackStarted = useCallback(() => {
    trackEvent(KycAnalyticsEvent.KYC_STARTED);
  }, []);

  const trackStepViewed = useCallback((step: KycStep) => {
    stepStartTime.current = Date.now();
    trackEvent(KycAnalyticsEvent.STEP_VIEWED, { step });
  }, []);

  const trackStepCompleted = useCallback((step: KycStep) => {
    const durationMs = Date.now() - stepStartTime.current;
    trackEvent(KycAnalyticsEvent.STEP_COMPLETED, { step, durationMs });
  }, []);

  const trackStepFailed = useCallback((step: KycStep, type: string, reason?: string) => {
    const durationMs = Date.now() - stepStartTime.current;
    trackEvent(KycAnalyticsEvent.STEP_FAILED, { 
      step, 
      durationMs,
      failureType: type,
      failureReason: reason 
    });
  }, []);

  const trackCompleted = useCallback(() => {
    trackEvent(KycAnalyticsEvent.KYC_COMPLETED);
  }, []);

  const trackRejected = useCallback((reason?: string) => {
    trackEvent(KycAnalyticsEvent.KYC_REJECTED, { failureReason: reason });
  }, []);

  return {
    trackStarted,
    trackStepViewed,
    trackStepCompleted,
    trackStepFailed,
    trackCompleted,
    trackRejected,
  };
}
