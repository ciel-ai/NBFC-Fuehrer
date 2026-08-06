import React from 'react';
import { Button, Skeleton } from 'antd';
import { CheckSeal, ConnectionLost, LedgerEmpty, SearchEmpty } from './stateIcons';

/* ============================================================================
 * The states every data screen needs.
 *
 *   <PageLoader />   — route-level Suspense fallback. A skeleton shaped like the
 *                      page that is arriving, so navigation resolves in place
 *                      instead of spinner-then-pop.
 *   <ErrorState />   — a failed fetch, with a retry that actually retries.
 *   <EmptyState />   — zero records (wired globally via ConfigProvider renderEmpty).
 *   <NoResults />    — zero MATCHES: a filter/search returned nothing, but the
 *                      table has data. Distinct from empty — the fix is "clear",
 *                      not "add your first record".
 *   <SuccessState /> — a terminal confirmation (a completed wizard, a submitted
 *                      queue). For transient feedback use a toast instead.
 *
 * There are no spinners in this application.
 * ==========================================================================*/

/** Skeleton row matching the ledger's real row height, so nothing reflows. */
const SkeletonRows: React.FC<{ rows?: number }> = ({ rows = 8 }) => (
  <div>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="skeleton-row">
        <Skeleton.Input
          active
          size="small"
          style={{ width: `${55 + ((i * 13) % 30)}%`, height: 12 }}
        />
      </div>
    ))}
  </div>
);

export const PageLoader: React.FC<{ tip?: string }> = () => (
  <div className="page" aria-busy="true" aria-label="Loading">
    <div className="page-header">
      <Skeleton.Input active style={{ width: 200, height: 24 }} />
    </div>

    {/* metric band */}
    <div className="metric-band">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="metric-cell">
          <Skeleton.Input active size="small" style={{ width: 72, height: 10 }} />
          <div className="mt-2">
            <Skeleton.Input active style={{ width: 104, height: 24 }} />
          </div>
        </div>
      ))}
    </div>

    {/* ledger */}
    <div className="panel">
      <div className="panel__head">
        <Skeleton.Input active size="small" style={{ width: 130, height: 14 }} />
      </div>
      <div className="panel__body panel__body--flush">
        <SkeletonRows />
      </div>
    </div>
  </div>
);

/** Inline skeleton for a panel that loads independently of the page. */
export const PanelLoader: React.FC<{ rows?: number }> = ({ rows }) => (
  <div aria-busy="true">
    <SkeletonRows rows={rows} />
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  detail?: string;
  onRetry?: () => void;
}> = ({
  title = 'Could not load this data',
  detail = 'The server did not respond. Check that the API is reachable, then retry.',
  onRetry,
}) => (
  <div className="state-view" role="alert">
    <span className="state-view__icon state-view__icon--danger">
      <ConnectionLost />
    </span>
    <p className="state-view__title">{title}</p>
    <p className="state-view__detail">{detail}</p>
    {onRetry && (
      <Button className="mt-4" onClick={onRetry}>
        Retry
      </Button>
    )}
  </div>
);

export const EmptyState: React.FC<{
  title?: string;
  detail?: string;
  action?: React.ReactNode;
}> = ({ title = 'No records', detail = 'There is nothing here yet.', action }) => (
  <div className="state-view">
    <span className="state-view__icon">
      <LedgerEmpty />
    </span>
    <p className="state-view__title">{title}</p>
    <p className="state-view__detail">{detail}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const NoResults: React.FC<{
  query?: string;
  onClear?: () => void;
}> = ({ query, onClear }) => (
  <div className="state-view">
    <span className="state-view__icon">
      <SearchEmpty />
    </span>
    <p className="state-view__title">No matches{query ? ` for “${query}”` : ''}</p>
    <p className="state-view__detail">
      No records match your search. Check the spelling, or clear the filters to see everything.
    </p>
    {onClear && (
      <Button className="mt-4" onClick={onClear}>
        Clear search
      </Button>
    )}
  </div>
);

export const SuccessState: React.FC<{
  title?: string;
  detail?: string;
  action?: React.ReactNode;
}> = ({ title = 'Done', detail, action }) => (
  <div className="state-view" role="status">
    <span className="state-view__icon state-view__icon--success">
      <CheckSeal />
    </span>
    <p className="state-view__title">{title}</p>
    {detail && <p className="state-view__detail">{detail}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
