import React from 'react';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import type { StatusTone } from '../theme/tokens';

/* ============================================================================
 * Metric band.
 *
 * Replaces the old grid of floating KPI cards — the single most "AI-generated
 * SaaS template" pattern in the app. Metrics now sit in one continuous band
 * divided by hairlines, so the row reads as a ledger summary rather than four
 * shadowed boxes with tinted icon chips.
 *
 * The icon chip is gone entirely. A KPI does not need an icon; it needs a
 * label, a figure, and a delta.
 * ==========================================================================*/

export interface Metric {
  label: string;
  value: React.ReactNode;
  /** Signed change vs. previous period; sign drives colour and arrow. */
  delta?: number;
  /** Overrides how delta is read: for NPA/overdue, "up" is bad. */
  deltaMeaning?: 'up-good' | 'up-bad';
  /** Static caption shown instead of a delta. */
  sub?: React.ReactNode;
  onClick?: () => void;
}

const Delta: React.FC<{ value: number; meaning: 'up-good' | 'up-bad' }> = ({ value, meaning }) => {
  if (value === 0) return <span className="metric-cell__delta">No change</span>;

  const up = value > 0;
  const good = meaning === 'up-good' ? up : !up;
  const tone: StatusTone = good ? 'success' : 'danger';

  return (
    <span className={`metric-cell__delta metric-cell__delta--${tone}`}>
      {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
};

export const MetricBand: React.FC<{ metrics: Metric[] }> = ({ metrics }) => (
  <div className="metric-band">
    {metrics.map((m) => {
      const interactive = Boolean(m.onClick);
      return (
        <div
          key={m.label}
          className={`metric-cell${interactive ? ' metric-cell--clickable' : ''}`}
          onClick={m.onClick}
          onKeyDown={
            interactive
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    m.onClick?.();
                  }
                }
              : undefined
          }
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
        >
          <div className="t-label truncate">{m.label}</div>
          <div className="metric-cell__value truncate">{m.value}</div>
          {m.delta !== undefined ? (
            <Delta value={m.delta} meaning={m.deltaMeaning ?? 'up-good'} />
          ) : m.sub !== undefined ? (
            <div className="metric-cell__delta">{m.sub}</div>
          ) : null}
        </div>
      );
    })}
  </div>
);

export default MetricBand;
