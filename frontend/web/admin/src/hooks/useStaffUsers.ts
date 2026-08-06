// src/hooks/useStaffUsers.ts
//
// Live staff-user list. Live-first with a labelled sample-data fallback that
// reports WHY it fell back — see hooks/useLiveData.ts. Write actions live in the
// page: when `live`, it calls usersApi and then reload(); otherwise it falls back
// to the store.

import { usersApi } from '../api/users.api';
import { useAppStore } from '../store/appStore';
import { useLiveData } from './useLiveData';
import type { DataSource } from './useLiveData';
import type { PortalUser } from '../types';

export function useStaffUsers(): {
  users: PortalUser[];
  source: DataSource;
  live: boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const mockUsers = useAppStore((s) => s.users);

  const { data, source, loading, error, reload } = useLiveData<PortalUser[]>(
    () => usersApi.list(),
    mockUsers,
  );

  return { users: data, source, live: source === 'live', loading, error, reload };
}
