import React from 'react';
import { Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { DataSource } from '../hooks/useLiveData';
import './DataSourceNotice.css';

/* ============================================================================
 * "Where did this data come from?"
 *
 * One component, used by every screen that can fall back to sample data. It
 * replaces six different hand-written subtitle strings, all variations on
 * " · sample data (live API unreachable)", none of which offered a retry.
 *
 *   live      → renders nothing. The normal case should be silent.
 *   mock      → a quiet, neutral marker. Sample data BY CONFIGURATION is not a
 *               fault, and dressing it up as one trains people to ignore warnings.
 *   fallback  → an actual problem: the API failed and figures on screen are NOT
 *               real. Says why, and offers a retry.
 *
 * The distinction matters in a lending back-office: someone must never mistake
 * sample figures for a real loan book.
 * ==========================================================================*/

export const DataSourceNotice: React.FC<{
  source: DataSource;
  error?: string | null;
  onRetry?: () => void;
}> = ({ source, error, onRetry }) => {
  if (source === 'live') return null;

  if (source === 'mock') {
    return (
      <div className="source-note source-note--mock">
        <span className="source-note__dot" />
        Sample data — mock mode is enabled
      </div>
    );
  }

  return (
    <div className="source-note source-note--fallback" role="status">
      <span className="source-note__dot" />
      <span className="grow">
        <strong>Showing sample data.</strong> {error ?? 'The live service is unreachable'} — the
        figures below are not your real book.
      </span>
      {onRetry && (
        <Button size="small" icon={<ReloadOutlined />} onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
};

export default DataSourceNotice;
