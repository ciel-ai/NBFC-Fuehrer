import React from 'react';

/**
 * Label-over-value grid for detail screens.
 *
 * The label is the app's micro-label style (.t-label) and the value is
 * medium-weight ink-900. That single step of contrast — tertiary uppercase
 * over near-black — is what makes a wall of 30 fields scannable.
 */
export const InfoGrid: React.FC<{ cols?: number; children: React.ReactNode }> = ({
  cols = 3,
  children,
}) => (
  <div className="info-grid" style={{ '--info-cols': cols } as React.CSSProperties}>
    {children}
  </div>
);

export const InfoItem: React.FC<{
  label: string;
  value?: React.ReactNode;
  span?: number;
  /** Renders the value with tabular figures — use for money, IDs, dates. */
  numeric?: boolean;
}> = ({ label, value, span, numeric }) => (
  <div
    className="info-item"
    style={span ? ({ gridColumn: `span ${span}` } as React.CSSProperties) : undefined}
  >
    <div className="t-label">{label}</div>
    <div className={`info-item__value${numeric ? ' tnum' : ''}`}>{value ?? '—'}</div>
  </div>
);

export const SectionTitle: React.FC<{
  children: React.ReactNode;
  extra?: React.ReactNode;
}> = ({ children, extra }) => (
  <div className="section-title">
    <span className="t-label">{children}</span>
    {extra}
  </div>
);
