/**
 * Format a number as Indian currency (₹)
 */
export function formatCurrency(
  amount: number,
  options?: { compact?: boolean; decimals?: number }
): string {
  const decimals = options?.decimals ?? 0;

  if (options?.compact) {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format phone number for display: 9800000012 → +91 9800000012
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

/**
 * Mask phone number: 9800000012 → 9X00000012
 */
export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '').slice(-10);
  if (cleaned.length === 10) {
    return `${cleaned[0]}X${cleaned.slice(2)}`;
  }
  return phone;
}

/**
 * Mask PAN: ABCDE1234F → ABCDE****F
 */
export function maskPAN(pan: string): string {
  if (pan.length !== 10) return pan;
  return `${pan.slice(0, 5)}****${pan.slice(9)}`;
}

/**
 * Format date: 2023-10-15 → 15 Oct, 2023
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Calculate EMI using standard formula
 * EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 */
export function calculateEMI(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number
): number {
  if (annualRatePercent === 0) return Math.round(principal / tenureMonths);
  const r = annualRatePercent / 12 / 100;
  const n = tenureMonths;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi);
}

/**
 * Format EMI tenure: 12 → "12 months"
 */
export function formatTenure(months: number): string {
  if (months === 12) return '1 year';
  if (months === 24) return '2 years';
  if (months === 36) return '3 years';
  if (months % 12 === 0) return `${months / 12} years`;
  return `${months} months`;
}

/**
 * Format large loan amounts: 5000000 → "50 Lakhs"
 */
export function formatLoanAmount(amount: number): string {
  if (amount >= 10000000) return `₹${amount / 10000000} Cr`;
  if (amount >= 100000) return `₹${amount / 100000} Lakhs`;
  if (amount >= 1000) return `₹${amount / 1000}K`;
  return `₹${amount}`;
}

/**
 * Sanitize text input — strip HTML/script tags
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>&"']/g, '')
    .trim();
}

/**
 * Format OTP countdown: 27 → "00:27"
 */
export function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
