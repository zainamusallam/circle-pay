import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addPublicCircleRequest,
  approvePublicCircleRequest,
  createPublicCircle,
  removePublicCircleRequest,
} from './public-circles';

const createListing = () => createPublicCircle({
  name: 'Community Savings',
  goal: 3000,
  capacity: 3,
  startDate: '2026-12-01',
  members: ['Ahmed'],
});

test('public circle requests stay pending until the owner approves them', () => {
  const listing = createListing();
  const requested = addPublicCircleRequest([listing], listing.id, '2026-11-16T10:00:00.000Z');
  assert.equal(requested[0].members.length, 1);
  assert.equal(requested[0].requests.length, 1);
  assert.equal(requested[0].requests[0].requester, 'Demo participant');

  const firstApproval = approvePublicCircleRequest(requested, listing.id, requested[0].requests[0].id);
  assert.equal(firstApproval.completed, null);
  assert.deepEqual(firstApproval.circles[0].members, ['Ahmed', 'Demo member 1']);
  assert.equal(firstApproval.circles[0].requests.length, 0);
});

test('approving the final open place activates a full circle', () => {
  const listing = createListing();
  const firstRequest = addPublicCircleRequest([listing], listing.id);
  const firstApproval = approvePublicCircleRequest(firstRequest, listing.id, firstRequest[0].requests[0].id);
  const lastRequest = addPublicCircleRequest(firstApproval.circles, listing.id);
  const completed = approvePublicCircleRequest(lastRequest, listing.id, lastRequest[0].requests[0].id);

  assert.equal(completed.circles.length, 0);
  assert.equal(completed.completed?.members.length, 3);
  assert.deepEqual(completed.completed?.members, ['Ahmed', 'Demo member 1', 'Demo member 2']);
});

test('a circle request can be cancelled or declined without adding a member', () => {
  const listing = createListing();
  const requested = addPublicCircleRequest([listing], listing.id);
  const requestId = requested[0].requests[0].id;

  assert.equal(removePublicCircleRequest(requested, listing.id, requestId)[0].requests.length, 0);
  const declined = approvePublicCircleRequest(requested, listing.id, 'missing-request');
  assert.equal(declined.circles[0].members.length, 1);
  assert.equal(declined.completed, null);
});
