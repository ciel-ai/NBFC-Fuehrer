// src/hooks/useStaffUsers.ts
//
// Live staff-user list — same live-first / labelled-fallback convention
// as useLms and useDashboard. Write actions live in the page: when `live`,
// it calls usersApi and then reload(); otherwise it falls back to the store.

import { useEffect, useState } from 'react';
import { usersApi } from '../api/users.api';
import { useAppStore } from '../store/appStore';
import type { PortalUser } from '../types';

export function useStaffUsers(): {
  users: PortalUser[];
  live: boolean;
  loading: boolean;
  reload: () => void;
} {
  const mockUsers = useAppStore((s) => s.users);
  const [data, setData] = useState<PortalUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    usersApi.list()
      .then((rows) => { if (alive) { setData(rows); setLoading(false); } })
      .catch(() => { if (alive) { setData(null); setLoading(false); } });
    return () => { alive = false; };
  }, [nonce]);

  return {
    users: data ?? mockUsers,
    live: data !== null,
    loading,
    reload: () => setNonce((n) => n + 1),
  };
}
