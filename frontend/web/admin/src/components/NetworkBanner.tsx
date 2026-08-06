import React from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import './NetworkBanner.css';

/* ============================================================================
 * NetworkBanner — the "No Internet" and "Slow Network" states.
 *
 * A fixed strip at the very top, shown ONLY when the connection is degraded, so
 * it costs nothing in the common case and never reflows the page. Offline wins
 * over slow (you can't be slow if you're off). Offline is role="alert" (it
 * interrupts); slow is role="status" (it informs).
 *
 * Mounted once, globally, above the router — so it covers sign-in, the console,
 * and the legal pages alike.
 * ==========================================================================*/

export const NetworkBanner: React.FC = () => {
  const { online, slow } = useNetworkStatus();

  if (!online) {
    return (
      <div className="netbar netbar--offline" role="alert">
        <span className="netbar__dot" aria-hidden="true" />
        <span className="netbar__text">
          <strong>You’re offline.</strong> Changes can’t be saved until the connection returns.
        </span>
      </div>
    );
  }

  if (slow) {
    return (
      <div className="netbar netbar--slow" role="status" aria-live="polite">
        <span className="netbar__dot" aria-hidden="true" />
        <span className="netbar__text">
          <strong>Slow connection.</strong> Some data may take longer than usual to load.
        </span>
      </div>
    );
  }

  return null;
};

export default NetworkBanner;
