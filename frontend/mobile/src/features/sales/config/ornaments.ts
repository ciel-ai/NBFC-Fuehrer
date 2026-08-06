import { z } from 'zod';

// ---------------------------------------------------------------------------
// Multi-ornament schedule for collateral products (Gold Loan CAM item 6).
// Each pledged ornament is one row with its own purity, weights, photo and
// remarks; net weight is always derived — never hand-typed:
//   net = (gross − stone) × (1 − impurity% / 100)
// ---------------------------------------------------------------------------

export interface OrnamentEntry {
  id: string;
  ornamentType: string;
  /** Numeric fields are kept as input strings; schemas coerce them. */
  itemCount: string;
  purity: string; // karat, e.g. '22'
  grossWeight: string; // grams
  stoneWeight: string; // grams, optional → ''
  impurityPct: string; // %, optional → ''
  photoUri: string;
  remarks: string;
}

export const ORNAMENT_TYPE_OPTIONS = [
  { label: 'Chain', value: 'chain' },
  { label: 'Bangles', value: 'bangles' },
  { label: 'Ring', value: 'ring' },
  { label: 'Necklace', value: 'necklace' },
  { label: 'Earrings', value: 'earrings' },
  { label: 'Coin', value: 'coin' },
  { label: 'Other', value: 'other' },
];

export const PURITY_OPTIONS = [
  { label: '18 Karat', value: '18' },
  { label: '20 Karat', value: '20' },
  { label: '22 Karat', value: '22' },
  { label: '24 Karat', value: '24' },
];

export const ornamentTypeLabel = (value: string): string =>
  ORNAMENT_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;

export function emptyOrnament(): OrnamentEntry {
  return {
    id: `orn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ornamentType: '',
    itemCount: '',
    purity: '',
    grossWeight: '',
    stoneWeight: '',
    impurityPct: '',
    photoUri: '',
    remarks: '',
  };
}

const num = (s: string): number => {
  const v = parseFloat(s);
  return Number.isNaN(v) ? 0 : v;
};

/** Derived net weight for one row, in grams (2 dp). */
export function ornamentNetWeight(o: OrnamentEntry): number {
  const gross = num(o.grossWeight);
  const stone = num(o.stoneWeight);
  const impurity = num(o.impurityPct);
  const net = (gross - stone) * (1 - impurity / 100);
  return net > 0 ? Math.round(net * 100) / 100 : 0;
}

export function ornamentTotals(rows: OrnamentEntry[]): {
  items: number;
  gross: number;
  net: number;
} {
  const totals = rows.reduce(
    (acc, o) => ({
      items: acc.items + Math.round(num(o.itemCount)),
      gross: acc.gross + num(o.grossWeight),
      net: acc.net + ornamentNetWeight(o),
    }),
    { items: 0, gross: 0, net: 0 },
  );
  return {
    items: totals.items,
    gross: Math.round(totals.gross * 100) / 100,
    net: Math.round(totals.net * 100) / 100,
  };
}

export const ornamentEntrySchema = z
  .object({
    id: z.string(),
    ornamentType: z.string().min(1, 'Select the ornament type'),
    itemCount: z.coerce
      .number({ invalid_type_error: 'Enter the item count' })
      .int('Whole numbers only')
      .positive('Enter the item count')
      .max(100, 'Item count seems too high — please check'),
    purity: z.string().min(1, 'Select the purity'),
    grossWeight: z.coerce
      .number({ invalid_type_error: 'Enter the gross weight' })
      .positive('Enter the gross weight')
      .max(10000, 'Gross weight cannot exceed 10,000 g'),
    stoneWeight: z.union([z.coerce.number().min(0, 'Cannot be negative'), z.literal('')]).optional(),
    impurityPct: z
      .union([z.coerce.number().min(0, 'Cannot be negative').max(50, 'Impurity above 50% — please check'), z.literal('')])
      .optional(),
    photoUri: z.string().min(1, 'Add a photo of this ornament'),
    remarks: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    const stone = typeof v.stoneWeight === 'number' ? v.stoneWeight : 0;
    if (stone >= v.grossWeight) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stoneWeight'],
        message: 'Stone weight must be less than the gross weight',
      });
    }
  });

/** Step-level schema: at least one valid ornament row. */
export const ornamentsStepSchema = z.object({
  ornaments: z.array(ornamentEntrySchema).min(1, 'Add at least one ornament'),
});

/** Field-level errors for the row editor: { fieldName: message }. */
export function validateOrnament(entry: OrnamentEntry): Record<string, string> {
  const result = ornamentEntrySchema.safeParse(entry);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}
