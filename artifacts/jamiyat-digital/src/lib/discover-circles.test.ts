import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findSimilarCircles, getDiscoverableCircles } from './discover-circles';

const listings = getDiscoverableCircles(new Date(2026, 10, 16));

test('circle discovery ranks goal and start-date matches together', () => {
  const matches = findSimilarCircles(listings, { goal: 3000, startDate: '2026-12-01' });
  assert.deepEqual(matches.map((circle) => circle.id), ['community-savers', 'home-goals']);
  assert.ok(matches[0].similarity! > matches[1].similarity!);
  assert.ok(matches.every((circle) => circle.openSpots === 1));
});

test('circle discovery can filter by a goal or start date independently', () => {
  const goalMatches = findSimilarCircles(listings, { goal: 7000 });
  assert.deepEqual(goalMatches.map((circle) => circle.id), ['office-savings']);

  const dateMatches = findSimilarCircles(listings, { startDate: '2026-12-01' });
  assert.equal(dateMatches[0].id, 'community-savers');
  assert.equal(dateMatches.length, 4);
});

test('browsing without preferences returns every circle with an open place', () => {
  const matches = findSimilarCircles(listings, {});
  assert.equal(matches.length, 4);
  assert.ok(matches.every((circle) => circle.similarity === null));
});

test('goal and start date outside the matching range produce no result', () => {
  const matches = findSimilarCircles(listings, { goal: 1000, startDate: '2028-01-01' });
  assert.deepEqual(matches, []);
});
