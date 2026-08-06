import React from 'react';
import { Tag } from 'antd';
import type { MigrationOrigin } from '../types';

/* ============================================================================
 * "This record came from the old system."
 *
 * Migrated accounts behave differently in ways staff cannot infer from the
 * screen: their history predates this platform, their mandate may never have
 * been re-registered, and a data-quality complaint about them belongs with the
 * migration, not the origination flow. One badge, used identically on the
 * customer directory, the customer file and the loan file, so the signal reads
 * the same everywhere.
 * ==========================================================================*/

export const MigratedTag: React.FC<{
  /** Omit for the customer-level badge, where no single origin applies. */
  origin?: MigrationOrigin;
  /** Number of migrated loans behind a customer-level badge. */
  count?: number;
}> = ({ origin, count }) => (
  <Tag
    title={
      origin
        ? `Migrated from ${origin.system} · legacy no. ${origin.legacyLoanNumber}`
        : count && count > 1
          ? `${count} accounts carried over from the legacy system`
          : 'Carried over from the legacy system'
    }
    style={{
      borderRadius: 999,
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: 0.4,
      color: 'var(--status-violet-fg)',
      background: 'var(--status-violet-tint)',
      borderColor: 'var(--status-violet-tint)',
    }}
  >
    MIGRATED
  </Tag>
);

export default MigratedTag;
