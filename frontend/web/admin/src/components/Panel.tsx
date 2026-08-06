import React from 'react';

/* ============================================================================
 * Panel — the surface primitive.
 *
 * This replaces the ad-hoc <Card  style={{boxShadow:...}}>
 * that was repeated across every screen. A panel is a hairline and a radius.
 * It does not float, it does not lift on hover, it has no shadow.
 *
 * Everything that was a "card" is a Panel. Consistency here is most of the
 * visual upgrade.
 * ==========================================================================*/

interface PanelProps {
  title?: React.ReactNode;
  /** Count shown beside the title — neutral, or amber when it needs attention. */
  count?: number;
  countTone?: 'neutral' | 'attention';
  extra?: React.ReactNode;
  /** Remove body padding — use when the body is a Table or a list of rows. */
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  count,
  countTone = 'neutral',
  extra,
  flush,
  className = '',
  children,
}) => (
  <section className={`panel ${className}`.trim()}>
    {(title || extra) && (
      <div className="panel__head">
        <div className="panel__title">
          {title}
          {count !== undefined && (
            <span
              className={`count-chip${countTone === 'attention' ? ' count-chip--attention' : ''}`}
            >
              {count}
            </span>
          )}
        </div>
        {extra && <div className="row gap-2">{extra}</div>}
      </div>
    )}
    <div className={`panel__body${flush ? ' panel__body--flush' : ''}`}>{children}</div>
  </section>
);

export default Panel;
