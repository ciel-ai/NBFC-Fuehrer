import React from 'react';

/** Label-over-value grid used across detail screens. */
export const InfoGrid: React.FC<{ cols?: number; children: React.ReactNode }> = ({ cols = 3, children }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(160, 560 / cols)}px, 1fr))`,
      gap: '18px 24px',
    }}
  >
    {children}
  </div>
);

export const InfoItem: React.FC<{ label: string; value?: React.ReactNode; span?: number }> = ({
  label,
  value,
  span,
}) => (
  <div style={span ? { gridColumn: `span ${span}` } : undefined}>
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        color: '#94a3b8',
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: 13.5, fontWeight: 500, color: '#1e293b', wordBreak: 'break-word' }}>
      {value ?? '—'}
    </div>
  </div>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: '#64748b',
      margin: '0 0 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      ...style,
    }}
  >
    {children}
  </div>
);
