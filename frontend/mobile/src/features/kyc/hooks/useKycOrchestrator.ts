import { useCallback } from 'react';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useKycStore } from '@/src/store/kycStore';
import { kycApi } from '../api/kycApi';
import { useKycAnalytics } from '../analytics/useKycAnalytics';
import { 
  resolveNextKycStep, 
  resolveCapabilities, 
  resolveFailureStrategy, 
  resolveNavigation 
} from '../resolvers/kycResolvers';
import { 
  KycStep, 
  KycStatus, 
  KycIntentDestination, 
  KycBackendResponse,
  KycStepPayload
} from '@/src/entities/kyc';

interface UseKycOrchestratorOptions {
  intentDestination?: KycIntentDestination;
  onComplete?: () => void | Promise<void>;
}

export function useKycOrchestrator(options: UseKycOrchestratorOptions = {}) {
  const { intentDestination, onComplete } = options;
  
  const store = useKycStore();
  const analytics = useKycAnalytics();

  const isKycComplete = store.status === KycStatus.COMPLETED;

  /**
   * 1. triggerKyc
   * Starts the flow or goes straight to completion action.
   */
  const triggerKyc = useCallback(async () => {
    if (isKycComplete) {
      await onComplete?.();
      return;
    }

    if (intentDestination) {
      store.saveIntentDestination(intentDestination);
    }

    analytics.trackStarted();
    
    // Begin flow by setting status and navigating to first step
    store.setEngineState({ status: KycStatus.IN_PROGRESS, currentStep: KycStep.PERMISSIONS });
    
    const initialRoute = resolveNavigation(KycStep.PERMISSIONS);
    if (initialRoute) {
      router.push(initialRoute);
    }
  }, [isKycComplete, intentDestination, onComplete, store, analytics]);


  /**
   * 2. submitStep Mutation
   * Sends payload to backend, resolves state, updates store, and navigates.
   */
  const submitMutation = useMutation<KycBackendResponse, Error, { step: KycStep; payload?: any }>({
    mutationFn: async ({ step, payload }) => {
      return await kycApi.submitStep(step, payload as any);
    },
    onSuccess: (response: KycBackendResponse, variables) => {
      // Extract resolutions
      const nextStep = resolveNextKycStep(response);
      const capabilities = resolveCapabilities(response);
      const failure = resolveFailureStrategy(response);

      // Update Store
      store.setEngineState({
        status: response.status,
        currentStep: nextStep,
        capabilities,
        failure,
      });

      // Track Analytics
      if (response.status === KycStatus.FAILED) {
        analytics.trackStepFailed(variables.step, failure?.type || 'UNKNOWN', failure?.message);
        // Handle failure routing (e.g., stay on screen or go to retry screen)
        // For MVP, we might stay on current screen
        return;
      }

      analytics.trackStepCompleted(variables.step);

      if (response.status === KycStatus.COMPLETED) {
        analytics.trackCompleted();
        handleCompletion();
        return;
      }

      // Resolve Navigation — each screen tracks its own STEP_VIEWED on mount,
      // so we only navigate here.
      const nextRoute = resolveNavigation(nextStep);
      if (nextRoute) {
        router.push(nextRoute);
      }
    },
    onError: (error, variables) => {
      analytics.trackStepFailed(variables.step, 'NETWORK_ERROR', error.message);
    }
  });

  const submitStep = useCallback(<T extends KycStep>(step: T, payload?: KycStepPayload<T>) => {
    // @ts-ignore - React query mutation variable typing
    return submitMutation.mutateAsync({ step, payload });
  }, [submitMutation]);

  /**
   * 3. Resume / Recover Session
   */
  const resumeSession = useCallback(() => {
    if (store.status === KycStatus.IN_PROGRESS && store.currentStep) {
      const route = resolveNavigation(store.currentStep);
      if (route) {
        analytics.trackStepViewed(store.currentStep);
        router.push(route);
      }
    }
  }, [store.status, store.currentStep, analytics]);

  /**
   * Internals
   */
  const handleCompletion = useCallback(async () => {
    // Use getState() instead of the closed-over `store` reference to guarantee
    // we always read fresh state — avoids stale-closure bugs when useMutation's
    // onSuccess fires after a re-render has changed the store object reference.
    const { intentDestination, clearIntent } = useKycStore.getState();
    clearIntent();

    // Guard against '/' as intent href — this happens when usePathname() is used
    // for an index route (groups + index are transparent in URLs) and there is no
    // app/index.tsx. Navigating to '/' in that case causes an unhandled GO_BACK error.
    //
    // Also normalise bare group paths like '/(checkout)' → '/(checkout)/index'.
    // useSegments() returns group names without the trailing /index segment, but
    // router.replace() needs a real screen path — otherwise Expo Router cannot
    // resolve the group root and internally falls back to a GO_BACK action.
    const rawHref = intentDestination?.href ?? '';
    const isValidHref = rawHref && rawHref !== '/';
    const resolvedHref = isValidHref && /^\/((?:\(\w[\w-]*\))|\w[\w-]*)$/.test(rawHref)
      ? `${rawHref}/index`
      : rawHref;

    if (isValidHref) {
      router.replace({ pathname: resolvedHref as any, params: intentDestination?.params });
    } else {
      router.replace('/(main)/(tabs)/home');
    }

    if (onComplete) {
      await onComplete();
    }
  }, [onComplete]);


  return {
    isKycComplete,
    isSubmitting: submitMutation.isPending,
    triggerKyc,
    submitStep,
    resumeSession,
    capabilities: store.capabilities,
  };
}
