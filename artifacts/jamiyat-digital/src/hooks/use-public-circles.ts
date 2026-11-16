import { useCallback, useEffect, useState } from 'react';
import {
  addPublicCircleRequest,
  approvePublicCircleRequest,
  createPublicCircle,
  removePublicCircleRequest,
  type CreatePublicCircleInput,
  type PublicCircle,
} from '@/lib/public-circles';

const STORAGE_KEY = 'circle-pay:public-circles:v1';

function loadPublicCircles(): PublicCircle[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((circle): circle is PublicCircle =>
      !!circle && typeof circle.id === 'string' && typeof circle.name === 'string' &&
      typeof circle.goal === 'number' && typeof circle.capacity === 'number' &&
      Array.isArray(circle.members) && Array.isArray(circle.requests) &&
      typeof circle.startDate === 'string');
  } catch {
    return [];
  }
}

export function usePublicCircles() {
  const [circles, setCircles] = useState<PublicCircle[]>(loadPublicCircles);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(circles));
    } catch {
      // Public circles remain available for this session if browser storage is blocked.
    }
  }, [circles]);

  const create = useCallback((input: CreatePublicCircleInput) => {
    const circle = createPublicCircle(input);
    setCircles((items) => [...items, circle]);
    return circle;
  }, []);

  const request = useCallback((id: string) => {
    setCircles((items) => addPublicCircleRequest(items, id));
  }, []);

  const cancelRequest = useCallback((id: string) => {
    setCircles((items) => removePublicCircleRequest(items, id));
  }, []);

  const approveRequest = useCallback((circleId: string, requestId: string) => {
    const result = approvePublicCircleRequest(circles, circleId, requestId);
    setCircles(result.circles);
    return result.completed;
  }, [circles]);

  const declineRequest = useCallback((circleId: string, requestId: string) => {
    setCircles((items) => removePublicCircleRequest(items, circleId, requestId));
  }, []);

  const reset = useCallback(() => setCircles([]), []);

  return { circles, create, request, cancelRequest, approveRequest, declineRequest, reset };
}
