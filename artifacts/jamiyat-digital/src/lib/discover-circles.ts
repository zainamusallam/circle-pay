import { addMonths, differenceInCalendarDays, format, startOfMonth } from 'date-fns';

export type DiscoverableCircle = {
  id: string;
  name: string;
  goal: number;
  capacity: number;
  members: string[];
  startDate: string;
  description: string;
};

export type CircleSearch = {
  goal?: number;
  startDate?: string;
};

export type CircleMatch = DiscoverableCircle & {
  similarity: number | null;
  openSpots: number;
};

/** Local-only listings for the Circle Pay presentation demo. */
export function getDiscoverableCircles(today = new Date()): DiscoverableCircle[] {
  const firstOfThisMonth = startOfMonth(today);
  const start = (monthOffset: number) =>
    format(addMonths(firstOfThisMonth, monthOffset), 'yyyy-MM-dd');

  return [
    {
      id: 'community-savers',
      name: 'Community Savers Circle',
      goal: 3000,
      capacity: 6,
      members: ['Fatima', 'Omar', 'Sara', 'Khalid', 'Noor'],
      startDate: start(1),
      description: 'A steady monthly rotation for a shared savings goal.',
    },
    {
      id: 'home-goals',
      name: 'The Home Goals Circle',
      goal: 3200,
      capacity: 6,
      members: ['Dana', 'Bader', 'Lulwa', 'Mishari', 'Hessa'],
      startDate: start(1),
      description: 'Six participants building toward home projects together.',
    },
    {
      id: 'family-travel',
      name: 'Family Travel Circle',
      goal: 5000,
      capacity: 6,
      members: ['Yousef', 'Maryam', 'Hamad', 'Reem', 'Faisal'],
      startDate: start(2),
      description: 'A larger goal with a little more time before the first month.',
    },
    {
      id: 'office-savings',
      name: 'Office Savings Circle',
      goal: 7000,
      capacity: 7,
      members: ['Khalid', 'Noor', 'Yousef', 'Maryam', 'Hamad', 'Sara'],
      startDate: start(2),
      description: 'A seven-person rotation with one place still open.',
    },
  ];
}

/**
 * Return circles near the requested goal (within 25%) and start date (within
 * 45 days), ordered by a combined similarity score.
 */
export function findSimilarCircles(
  circles: DiscoverableCircle[],
  search: CircleSearch,
): CircleMatch[] {
  const goal = search.goal && Number.isFinite(search.goal) && search.goal > 0 ? search.goal : undefined;
  const date = search.startDate && !Number.isNaN(Date.parse(search.startDate))
    ? new Date(`${search.startDate}T00:00:00`)
    : undefined;
  const hasSearch = goal !== undefined || date !== undefined;

  return circles
    .map((circle) => {
      const goalGap = goal === undefined ? undefined : Math.abs(circle.goal - goal) / goal;
      const dateGap = date === undefined
        ? undefined
        : Math.abs(differenceInCalendarDays(new Date(`${circle.startDate}T00:00:00`), date));
      const matchesGoal = goalGap === undefined || goalGap <= 0.25;
      const matchesDate = dateGap === undefined || dateGap <= 45;
      const scores = [
        goalGap === undefined ? undefined : Math.max(0, 1 - goalGap / 0.25),
        dateGap === undefined ? undefined : Math.max(0, 1 - dateGap / 45),
      ].filter((score): score is number => score !== undefined);
      const similarity = hasSearch && scores.length
        ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100)
        : null;

      return {
        ...circle,
        similarity,
        openSpots: Math.max(0, circle.capacity - circle.members.length),
        _matches: matchesGoal && matchesDate,
      };
    })
    .filter((circle) => circle._matches && circle.openSpots > 0)
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .map(({ _matches: _ignored, ...circle }) => circle);
}
