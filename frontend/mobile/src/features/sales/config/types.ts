import type { Ionicons } from '@expo/vector-icons';
import type { ZodType } from 'zod';
import type {
  SalesApplicationStatus,
  SalesProduct,
} from '@/src/entities/salesAgent';

// ---------------------------------------------------------------------------
// Config-driven wizard model.
//
// Each LOS journey (CDL / Gold / Housing) is described as a list of steps; each
// step is a list of fields plus a per-step zod schema. One generic engine
// (SalesWizardScreen) renders any product, so the 15 / 12 / 17 "screens" become
// data, and every screen automatically inherits the same happy / loading /
// empty / error / validation / success / submitting states.
// ---------------------------------------------------------------------------

export type IoniconName = keyof typeof Ionicons.glyphMap;

export type SalesFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'number'
  | 'currency'
  | 'pan'
  | 'aadhaar'
  | 'pincode'
  | 'select'
  | 'date'
  | 'checkbox'
  | 'photo'
  | 'document'
  /** Read-only row computed from earlier answers (e.g. processing fee, EMI). */
  | 'derived';

export interface SalesFieldOption {
  label: string;
  value: string;
}

/** All answers collected so far, across every step of the wizard. */
export type SalesFormValues = Record<string, unknown>;

export interface SalesFieldConfig {
  name: string;
  label: string;
  type: SalesFieldType;
  placeholder?: string;
  /** Static options for `select`. */
  options?: SalesFieldOption[];
  /**
   * Options derived from earlier answers — e.g. the permitted interest rates
   * depend on the employment type chosen two steps back. Takes precedence over
   * `options` when present.
   */
  optionsFrom?: (values: SalesFormValues) => SalesFieldOption[];
  /** Value renderer for `derived` fields. */
  compute?: (values: SalesFormValues) => string;
  /** Helper / hint text shown under the field when there is no error. */
  helper?: string;
  /** Helper text derived from earlier answers. Takes precedence over `helper`. */
  helperFrom?: (values: SalesFormValues) => string | undefined;
  /** Marks the field as optional (skips required validation messaging). */
  optional?: boolean;
  maxLength?: number;
  /** Fixed inline prefix, e.g. '+91' or '₹'. */
  prefix?: string;
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
  /** Acquisition source for `photo` / `document` fields. */
  capture?: 'camera' | 'library' | 'document';
  /** Two-column layout hint (pairs with the adjacent half-width field). */
  half?: boolean;
}

export type SalesStepKind = 'form' | 'review' | 'submit';

export interface SalesStepConfig {
  id: string;
  title: string;
  subtitle?: string;
  icon: IoniconName;
  /** Defaults to 'form'. 'review' renders a read-only summary; 'submit' is the final CTA. */
  kind?: SalesStepKind;
  fields?: SalesFieldConfig[];
  /** Per-step validation. Keys are a subset of the step's field names. */
  schema?: ZodType<unknown>;
  /** Optional info banner shown above the step body. */
  note?: string;
}

export interface SalesDashboardTile {
  /** Status this tile counts, or the special 'new' / 'draft' tiles. */
  key: SalesApplicationStatus | 'new' | 'draft';
  label: string;
  icon: IoniconName;
  color: string;
  bg: string;
}

export interface SalesProductConfig {
  product: SalesProduct;
  title: string;
  shortTitle: string;
  description: string;
  icon: IoniconName;
  /** Product accent — always a theme token, never a raw hex. */
  accent: string;
  accentBg: string;
  /** Label for the primary "start a new application" action. */
  newLabel: string;
  steps: SalesStepConfig[];
  tiles: SalesDashboardTile[];
}
