import { useCallback } from 'react';
import { useCloudState } from './use-cloud-state';
import {
  addPublicCircleRequest,
  approvePublicCircleRequest,
  createPublicCircle,
  removePublicCircleRequest,
  type CreatePublicCircleInput,
  type PublicCircle,
} from '@/lib/public-circles';

const EMPTY_PUBLIC_CIRCLES: PublicCircle[] = [];

function isPublicCircles(value: unknown): value is PublicCircle[] {
  return Array.isArray(value) && value.every((circle) =>
      !!circle && typeof circle.id === 'string' && typeof circle.name === 'string' &&
      typeof circle.goal === 'number' && typeof circle.capacity === 'number' &&
      Array.isArray(circle.members) && Array.isArray(circle.requests) &&
      typeof circle.startDate === 'string');
}

function readLegacyPublicCircles(): unknown {
  try {
    const raw = localStorage.getItem('circle-pay:public-circles:v1');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function usePublicCircles(userId: string | null) {
  const cloud = useCloudState(userId, 'public_circles', EMPTY_PUBLIC_CIRCLES, isPublicCircles, readLegacyPublicCircles);
  const circles = cloud.state;
  const setCircles = cloud.setState;

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

  return { circles, create, request, cancelRequest, approveRequest, declineRequest, reset, loading: cloud.loading, error: cloud.error, synced: cloud.synced };
}
