import { Colors } from '@/src/core/theme/colors';
import type { SalesDashboardTile, SalesFieldOption } from './types';

// A pragmatic subset of states for the demo/mock; the picker handles any value.
export const STATE_OPTIONS: SalesFieldOption[] = [
  { label: 'Andhra Pradesh', value: 'AP' },
  { label: 'Delhi', value: 'DL' },
  { label: 'Gujarat', value: 'GJ' },
  { label: 'Karnataka', value: 'KA' },
  { label: 'Kerala', value: 'KL' },
  { label: 'Maharashtra', value: 'MH' },
  { label: 'Tamil Nadu', value: 'TN' },
  { label: 'Telangana', value: 'TG' },
  { label: 'Uttar Pradesh', value: 'UP' },
  { label: 'West Bengal', value: 'WB' },
];

// Status-tile presets — colours come straight from theme tokens so every
// dashboard reads as part of the existing design system.
export const TILE_PRESETS = {
  new: (label: string): SalesDashboardTile => ({
    key: 'new', label, icon: 'add-circle-outline', color: Colors.primary, bg: Colors.primaryLight,
  }),
  draft: (label: string): SalesDashboardTile => ({
    key: 'draft', label, icon: 'document-text-outline', color: Colors.textSecondary, bg: Colors.backgroundLight,
  }),
  submitted: (label: string): SalesDashboardTile => ({
    key: 'submitted', label, icon: 'paper-plane-outline', color: Colors.primary, bg: Colors.primaryLight,
  }),
  inReview: (label: string): SalesDashboardTile => ({
    key: 'in_review', label, icon: 'sync-outline', color: Colors.goldDark, bg: Colors.goldLight,
  }),
  siteVisit: (label: string): SalesDashboardTile => ({
    key: 'site_visit_pending', label, icon: 'location-outline', color: Colors.goldDark, bg: Colors.goldLight,
  }),
  valuation: (label: string): SalesDashboardTile => ({
    key: 'valuation_pending', label, icon: 'time-outline', color: Colors.goldDark, bg: Colors.goldLight,
  }),
  approved: (label: string): SalesDashboardTile => ({
    key: 'approved', label, icon: 'checkmark-circle-outline', color: Colors.success, bg: Colors.successLight,
  }),
  rejected: (label: string): SalesDashboardTile => ({
    key: 'rejected', label, icon: 'close-circle-outline', color: Colors.error, bg: Colors.errorLight,
  }),
  disbursed: (label: string): SalesDashboardTile => ({
    key: 'disbursed', label, icon: 'cash-outline', color: Colors.teal, bg: Colors.tealLight,
  }),
};
