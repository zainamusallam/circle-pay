import type { DiscoverableCircle } from './discover-circles';

export type PublicJoinRequest = {
  id: string;
  requester: string;
  createdAt: string;
};

export type PublicCircle = DiscoverableCircle & {
  name: string;
  requests: PublicJoinRequest[];
};

export type CreatePublicCircleInput = {
  name: string;
  goal: number;
  capacity: number;
  startDate: string;
  members: string[];
};

export function createPublicCircle(input: CreatePublicCircleInput): PublicCircle {
  return {
    ...input,
    id: `public_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    members: [...input.members],
    requests: [],
  };
}

export function addPublicCircleRequest(
  circles: PublicCircle[],
  circleId: string,
  timestamp = new Date().toISOString(),
): PublicCircle[] {
  return circles.map((circle) => {
    if (circle.id !== circleId || circle.members.length >= circle.capacity || circle.requests.length > 0) return circle;
    return {
      ...circle,
      requests: [{
        id: `request_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        requester: 'Demo participant',
        createdAt: timestamp,
      }],
    };
  });
}

export function removePublicCircleRequest(
  circles: PublicCircle[],
  circleId: string,
  requestId?: string,
): PublicCircle[] {
  return circles.map((circle) => circle.id !== circleId ? circle : {
    ...circle,
    requests: requestId
      ? circle.requests.filter((request) => request.id !== requestId)
      : [],
  });
}

export function approvePublicCircleRequest(
  circles: PublicCircle[],
  circleId: string,
  requestId: string,
): { circles: PublicCircle[]; completed: PublicCircle | null } {
  const circle = circles.find((candidate) => candidate.id === circleId);
  const request = circle?.requests.find((candidate) => candidate.id === requestId);
  if (!circle || !request || circle.members.length >= circle.capacity) {
    return { circles, completed: null };
  }

  let guestNumber = 1;
  while (circle.members.includes(`Demo member ${guestNumber}`)) guestNumber += 1;
  const updated: PublicCircle = {
    ...circle,
    members: [...circle.members, `Demo member ${guestNumber}`],
    requests: circle.requests.filter((candidate) => candidate.id !== requestId),
  };

  if (updated.members.length >= updated.capacity) {
    return {
      circles: circles.filter((candidate) => candidate.id !== circleId),
      completed: updated,
    };
  }

  return {
    circles: circles.map((candidate) => candidate.id === circleId ? updated : candidate),
    completed: null,
  };
}
