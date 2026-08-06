import React from 'react';
import { chart, font, ink, radius, space } from '../theme/tokens';
import Panel from './Panel';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
  height?: number;
  children: React.ReactNode;
}

/** Analytics panel with a fixed-height plot area. */
const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  extra,
  height = 260,
  children,
}) => (
  <Panel
    title={
      <div>
        <div className="panel__title">{title}</div>
        {subtitle && <div className="t-meta mt-1">{subtitle}</div>}
      </div>
    }
    extra={extra}
  >
    <div style={{ height, width: '100%' }}>{children}</div>
  </Panel>
);

export default ChartCard;

/* ── Recharts shared config ───────────────────────────────────────────────────
 * Recharts takes style objects, not classes, so these are the one legitimate
 * place inline styles survive — but they are still built from tokens. */

export const tooltipStyle: React.CSSProperties = {
  background: ink[800],
  border: 'none',
  borderRadius: radius.sm,
  padding: `${space[2]}px ${space[3]}px`,
  boxShadow: '0 8px 24px rgba(14,20,23,0.18)',
  fontSize: font.size.sm,
  color: ink[0],
};

export const tooltipItemStyle: React.CSSProperties = {
  color: ink[150],
  fontSize: font.size.sm,
  padding: 0,
};

export const tooltipLabelStyle: React.CSSProperties = {
  color: ink[300],
  fontSize: font.size.xs,
  marginBottom: space[1],
};

/** Axis/grid defaults — spread onto <XAxis>, <YAxis>, <CartesianGrid>. */
export const axisProps = {
  stroke: chart.axis,
  fontSize: font.size.xs,
  tickLine: false,
  axisLine: false,
} as const;

export const gridProps = {
  stroke: chart.grid,
  strokeDasharray: '0',
  vertical: false,
} as const;
