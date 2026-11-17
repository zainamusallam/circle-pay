import { useCallback } from 'react';
import { useCloudState } from './use-cloud-state';

const EMPTY_REQUESTS: string[] = [];
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((id) => typeof id === 'string');

function readLegacyJoinRequests(): unknown {
  try {
    const raw = localStorage.getItem('circle-pay:join-requests:v1');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useJoinRequests(userId: string | null) {
  const cloud = useCloudState(userId, 'join_requests', EMPTY_REQUESTS, isStringArray, readLegacyJoinRequests);
  const requestedIds = cloud.state;
  const setRequestedIds = cloud.setState;

  const request = useCallback((id: string) => {
    setRequestedIds((ids) => ids.includes(id) ? ids : [...ids, id]);
  }, []);

  const cancel = useCallback((id: string) => {
    setRequestedIds((ids) => ids.filter((item) => item !== id));
  }, []);

  const reset = useCallback(() => setRequestedIds([]), []);

  return { requestedIds, request, cancel, reset, loading: cloud.loading, error: cloud.error, synced: cloud.synced };
}
