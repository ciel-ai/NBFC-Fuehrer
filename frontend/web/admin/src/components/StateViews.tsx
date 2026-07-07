// src/components/StateViews.tsx
//
// Shared UI states — the three views every data screen needs:
//   <PageLoader />  — route-level Suspense fallback / full-page fetch
//   <ErrorState />  — a failed fetch or action, with retry
//   <EmptyState />  — a legitimate zero-results state (also wired globally
//                     as the Table empty view via ConfigProvider renderEmpty)

import React from 'react';
import { Button, Spin } from 'antd';
import { CloudOffline, InboxIcon } from './stateIcons';

// ─── Route / full-page loader ─────────────────────────────────────────────────

export const PageLoader: React.FC<{ tip?: string }> = ({ tip }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '110px 0' }}>
    <Spin size="large" />
    {tip && <div style={{ fontSize: 13, color: '#7c8896' }}>{tip}</div>}
  </div>
);

// ─── Error state (fetch/action failure) ───────────────────────────────────────

export const ErrorState: React.FC<{
  title?: string;
  detail?: string;
  onRetry?: () => void;
}> = ({
  title = 'Could not load this data',
  detail = 'The server did not respond. Check that the API is reachable, then retry.',
  onRetry,
}) => (
  <div role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '56px 24px' }}>
    <CloudOffline />
    <div style={{ marginTop: 14, fontSize: 15, fontWeight: 700, color: '#1d2733' }}>{title}</div>
    <div style={{ marginTop: 5, fontSize: 13, color: '#7c8896', maxWidth: 420, lineHeight: 1.55 }}>{detail}</div>
    {onRetry && (
      <Button type="primary" style={{ marginTop: 18 }} onClick={onRetry}>
        Retry
      </Button>
    )}
  </div>
);

// ─── Empty state (zero results) ───────────────────────────────────────────────

export const EmptyState: React.FC<{
  title?: string;
  detail?: string;
  action?: React.ReactNode;
}> = ({
  title = 'Nothing here yet',
  detail = 'No records match — try clearing the filters or search.',
  action,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '44px 24px' }}>
    <InboxIcon />
    <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600, color: '#3d4a59' }}>{title}</div>
    <div style={{ marginTop: 4, fontSize: 12.5, color: '#94a3b8', maxWidth: 380, lineHeight: 1.5 }}>{detail}</div>
    {action && <div style={{ marginTop: 16 }}>{action}</div>}
  </div>
);
