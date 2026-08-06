import React, { useCallback, useEffect, useState } from 'react';
import { Segmented, Table } from 'antd';
import type { TableProps } from 'antd';
import { BorderHorizontalOutlined, MenuOutlined, MinusOutlined } from '@ant-design/icons';
import type { DensityKey } from '../theme/tokens';

/* ============================================================================
 * DataTable — the ledger.
 *
 * Wraps AntD Table with the three things every data screen in this app needs
 * and none of them had:
 *
 *   1. Density as a real control (compact / default / comfortable), persisted
 *      per user. An analyst working a 400-row collections queue and a manager
 *      skimming 12 approvals want different tables.
 *   2. Horizontal scroll containment — the old tables simply overflowed the
 *      viewport below ~1200px.
 *   3. Sticky headers, so scrolling a long ledger never loses the column names.
 * ==========================================================================*/

const STORAGE_KEY = 'fc.density';

const OPTIONS = [
  { value: 'compact', icon: <MenuOutlined />, title: 'Compact' },
  { value: 'default', icon: <BorderHorizontalOutlined />, title: 'Default' },
  { value: 'comfortable', icon: <MinusOutlined />, title: 'Comfortable' },
];

/** Density is a user preference, not page state — it persists across the app. */
export function useDensity(): [DensityKey, (d: DensityKey) => void] {
  const [density, setDensity] = useState<DensityKey>(
    () => (localStorage.getItem(STORAGE_KEY) as DensityKey) || 'default',
  );

  const update = useCallback((d: DensityKey) => {
    setDensity(d);
    localStorage.setItem(STORAGE_KEY, d);
  }, []);

  useEffect(() => {
    const sync = (e: StorageEvent): void => {
      if (e.key === STORAGE_KEY && e.newValue) setDensity(e.newValue as DensityKey);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  return [density, update];
}

export const DensityToggle: React.FC<{
  value: DensityKey;
  onChange: (d: DensityKey) => void;
}> = ({ value, onChange }) => (
  <Segmented
    size="small"
    value={value}
    onChange={(v) => onChange(v as DensityKey)}
    options={OPTIONS}
    aria-label="Table density"
  />
);

interface DataTableProps<T> extends TableProps<T> {
  /** Omit to follow the user's global density preference (set in the header). */
  density?: DensityKey;
  /** Marks rows that need attention with a left rule (overdue / NPA / failed). */
  flagRow?: (record: T) => 'danger' | 'warning' | false;
}

export function DataTable<T extends object>({
  density,
  flagRow,
  rowClassName,
  scroll,
  ...rest
}: DataTableProps<T>): React.ReactElement {
  /* Density is a single app-wide preference, set once in the header, rather than
     a per-page control repeated 15 times. Passing `density` explicitly still wins. */
  const [preferred] = useDensity();
  const active = density ?? preferred;

  const rowCls = useCallback(
    (record: T, index: number, indent: number): string => {
      const base =
        typeof rowClassName === 'function'
          ? rowClassName(record, index, indent)
          : (rowClassName ?? '');
      const flag = flagRow?.(record);
      if (flag === 'danger') return `${base} row-flag`.trim();
      if (flag === 'warning') return `${base} row-flag-warn`.trim();
      return base;
    },
    [flagRow, rowClassName],
  );

  return (
    <div className={`density-${active}`}>
      <Table<T>
        size={active === 'comfortable' ? 'middle' : 'small'}
        rowClassName={rowCls}
        /* No scroll.x and no `sticky` by default — and that is deliberate.
         *
         * Both of those flip AntD into `table-layout: fixed` (sticky renders the
         * header as a SECOND table, so the two have to be width-aligned). Under
         * fixed layout any column without an explicit `width` collapses — the
         * identity column on this page shrank to 80px and its content rendered
         * on top of the neighbouring cell.
         *
         * Horizontal containment is handled in CSS instead (see .ant-table-content
         * in index.css), which keeps the natural `auto` layout. A page whose
         * columns all declare a width can still opt into scroll/sticky itself. */
        scroll={scroll}
        /* Explicit: AntD otherwise infers `fixed` as soon as any column declares a
           width, which starves the columns that don't declare one. Under `auto`,
           a column `width` behaves as a hint and the identity column takes the
           space its content actually needs. */
        tableLayout="auto"
        {...rest}
      />
    </div>
  );
}

export default DataTable;
