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
  // Preserve any query string (e.g. ?ref=xxx) when rewriting a path.
  const query = path.includes('?') ? path.slice(path.indexOf('?')) : '';

  // Payment gateway callback after UPI / net-banking redirect.
  if (path.startsWith('/payment/success')) {
    return `/(main)/loan-detail/payment-success${query}`;
  }
  if (path.startsWith('/payment/failure')) {
    return `/(main)/loan-detail/payment-failure${query}`;
  }

  // Deep link to a specific loan: fuehrer://loans/123 → loan-detail screen.
  if (path.startsWith('/loans/')) {
    return path.replace('/loans/', '/(main)/loan-detail/');
  }

  // Push notification tap → notifications screen.
  if (path === '/notifications') {
    return '/(main)/notifications';
  }

  return initial ? '/(public)' : path;
}
