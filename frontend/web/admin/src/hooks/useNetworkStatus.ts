import { useEffect, useState } from 'react';

/* ============================================================================
 * useNetworkStatus — the browser's own view of the connection.
 *
 * `online`  reflects navigator.onLine, kept live via the online/offline events.
 * `slow`    reads the (non-standard) Network Information API — effectiveType of
 *           2g / slow-2g, or the user's explicit Data Saver. Chromium-only; on
 *           Safari/Firefox `slow` simply stays false rather than guessing.
 *
 * Powers <NetworkBanner/>. Kept as a hook so any screen can also react to it
 * (e.g. defer a heavy chart on a slow link).
 * ==========================================================================*/

export interface NetworkStatus {
  online: boolean;
  slow: boolean;
}

interface Connection {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: 'change', cb: () => void) => void;
  removeEventListener?: (type: 'change', cb: () => void) => void;
}

function getConnection(): Connection | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const nav = navigator as Navigator & {
    connection?: Connection;
    mozConnection?: Connection;
    webkitConnection?: Connection;
  };
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
}

const SLOW_TYPES = new Set(['slow-2g', '2g']);

export function useNetworkStatus(): NetworkStatus {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const goOnline = (): void => setOnline(true);
    const goOffline = (): void => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    const conn = getConnection();
    const readSlow = (): void =>
      setSlow(!!conn && (SLOW_TYPES.has(conn.effectiveType ?? '') || conn.saveData === true));
    readSlow();
    conn?.addEventListener?.('change', readSlow);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      conn?.removeEventListener?.('change', readSlow);
    };
  }, []);

  return { online, slow };
}

export default useNetworkStatus;
