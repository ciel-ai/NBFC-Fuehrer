import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/** ₹12,34,567 — full Indian grouping */
export const inr = (value: number, fractionDigits = 0): string =>
  '₹' +
  value.toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

/** Compact Indian notation: ₹4.5L, ₹1.2Cr, ₹85K */
export const inrCompact = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(abs >= 10_00_00_000 ? 1 : 2)}Cr`;
  if (abs >= 1_00_000) return `₹${(value / 1_00_000).toFixed(abs >= 10_00_000 ? 1 : 2)}L`;
  if (abs >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`;
  return inr(value);
};

export const fmtDate = (iso?: string): string => (iso ? dayjs(iso).format('DD MMM YYYY') : '—');
export const fmtDateTime = (iso?: string): string => (iso ? dayjs(iso).format('DD MMM YYYY, hh:mm A') : '—');
export const fmtTimeAgo = (iso?: string): string => (iso ? dayjs(iso).fromNow() : '—');

export const pct = (value: number, digits = 1): string => `${value.toFixed(digits)}%`;

export const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

export const maskAccount = (acc: string): string =>
  acc.length > 4 ? `••••${acc.slice(-4)}` : acc;

/** Standard reducing-balance EMI */
export const calcEmi = (principal: number, annualRatePct: number, months: number): number => {
  const r = annualRatePct / 12 / 100;
  if (r === 0) return Math.round(principal / months);
  const f = Math.pow(1 + r, months);
  return Math.round((principal * r * f) / (f - 1));
};

export const dpdBucket = (dpd: number): string => {
  if (dpd <= 0) return 'Current';
  if (dpd <= 30) return '1–30';
  if (dpd <= 60) return '31–60';
  if (dpd <= 90) return '61–90';
  return '90+';
};
