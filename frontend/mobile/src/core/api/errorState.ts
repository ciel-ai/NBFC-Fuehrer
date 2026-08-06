import { ParsedApiError } from '@/src/core/api/errorParser';
import { AppStateKind } from '@/src/shared/components/common/AppStateView';

export function getAppStateFromApiError(error: ParsedApiError): AppStateKind {
  if (error.code === 'UNAUTHORIZED' || error.status === 401) return 'sessionExpired';
  if (error.code === 'FORBIDDEN' || error.status === 403) return 'permissionDenied';
  if (error.code === 'TIMEOUT' || error.code === 'ECONNABORTED') return 'slowNetwork';
  if (error.code === 'NETWORK_ERROR' || error.message.toLowerCase().includes('network')) return 'offline';
  if (error.status === 422 || error.code === 'VALIDATION_ERROR') return 'validation';
  return 'error';
}
