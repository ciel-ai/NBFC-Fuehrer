/**
 * Deep link handler for the fuehrer:// scheme.
 *
 * Handles:
 *  - Payment callbacks  : fuehrer://payment/success?ref=xxx
 *                         fuehrer://payment/failure?ref=xxx
 *  - Loan deep links   : fuehrer://loans/123
 *  - Push notification : fuehrer://notifications
 *  - Default fallback  : route back to public landing or the given path
 */
export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string {
  // Payment gateway callback after UPI / net-banking redirect
  if (path.startsWith('/payment/')) {
    return path; // handled by (repayment) group
  }

  // Deep link to a specific loan: fuehrer://loans/123 → loan-detail screen
  if (path.startsWith('/loans/')) {
    return path.replace('/loans/', '/(main)/loan-detail/');
  }

  // Push notification tap → notifications screen (once built)
  if (path === '/notifications') {
    return '/(main)/(tabs)/home'; // redirect to home until notifications screen exists
  }

  return initial ? '/(public)' : path;
}
