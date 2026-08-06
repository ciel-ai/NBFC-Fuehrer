import { Redirect } from 'expo-router';

// The public landing screen lives at (auth)/landing. Loan consents (T&C /
// KYC / bureau) are collected at the loan-application entry points, not here
// (see src/features/loans/components/LoanConsentGate.tsx). This route is kept
// only as a stable fallback target (logout, +not-found, deep-link initial
// route) and immediately forwards to it.
export default function PublicIndex() {
  return <Redirect href="/(auth)/landing" />;
}
