import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'circle-pay:join-requests:v1';

function loadRequests(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function useJoinRequests() {
  const [requestedIds, setRequestedIds] = useState<string[]>(loadRequests);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requestedIds));
    } catch {
      // Requests remain available for this session when browser storage is blocked.
    }
  }, [requestedIds]);

  const request = useCallback((id: string) => {
    setRequestedIds((ids) => ids.includes(id) ? ids : [...ids, id]);
  }, []);

  const cancel = useCallback((id: string) => {
    setRequestedIds((ids) => ids.filter((item) => item !== id));
  }, []);

  const reset = useCallback(() => setRequestedIds([]), []);

  return { requestedIds, request, cancel, reset };
}
