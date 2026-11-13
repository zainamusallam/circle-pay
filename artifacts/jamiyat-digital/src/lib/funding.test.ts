import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCircle, statusOf } from './circles';
import { collectMonth, heldForCircle, initialFunding, simulateBilling } from './funding';

const stamp = '2026-11-13T10:00:00.000Z';
const fixture = () => initialFunding([buildCircle({
  name: 'Test Circle', amount: 40.125, months: 3, startDate: '2026-12-01',
})]);
const total = (s: ReturnType<typeof fixture>) => Math.round(1000 * (
  s.wallets.reduce((sum, w) => sum + w.balance, 0) +
  s.circles.reduce((sum, c) => sum + heldForCircle(c), 0)));

test('debits every participant and conserves funds in a fully queued vault', () => {
  const before = fixture();
  const after = simulateBilling(before, stamp);
  assert.equal(total(after), total(before));
  assert.equal(after.lastRun?.debited, 3);
  assert.equal(after.lastRun?.secured, 1);
  assert.equal(heldForCircle(after.circles[0]), 120.375);
  assert.equal(statusOf(after.circles[0].schedule[0]), 'Auto-Paid (Escrow Secured)');
  assert.equal(after.transactions.length, 4);
  assert.equal(after.simulatedDate, '2026-12-01');
  assert.equal(before.wallets[0].balance, 1500);
});

test('release credits recipient once and conserves total including future queued months', () => {
  const before = fixture();
  const first = simulateBilling(before, stamp);
  const second = simulateBilling(first, stamp);
  const id = second.circles[0].id;
  assert.equal(heldForCircle(second.circles[0]), 240.75);
  assert.equal(collectMonth(second, id, 2, stamp), second, 'out-of-order release blocked');
  const released = collectMonth(second, id, 1, stamp);
  assert.equal(total(released), total(before));
  assert.equal(heldForCircle(released.circles[0]), 120.375);
  assert.equal(released.wallets.find((w) => w.member === 'Ahmed')!.balance, 1540.125);
  assert.equal(collectMonth(released, id, 1, stamp), released);
  assert.equal(released.transactions.filter((t) => t.kind === 'transfer').length, 1);
});

test('partial failures remain Pending and retries never double-debit paid members', () => {
  const before = fixture();
  before.wallets.find((w) => w.member === 'Fatima')!.balance = 0;
  const first = simulateBilling(before, stamp);
  const retry = simulateBilling(first, stamp);
  assert.equal(first.lastRun?.failed, 1);
  assert.equal(statusOf(first.circles[0].schedule[0]), 'Pending');
  assert.equal(retry.lastRun?.debited, 0);
  assert.equal(retry.circles[0].schedule[0].funding?.payments.length, 2);
  assert.equal(retry.wallets[0].balance, first.wallets[0].balance);
  assert.equal(total(retry), total(before));
  retry.wallets.find((w) => w.member === 'Fatima')!.balance = 100;
  const funded = simulateBilling(retry, stamp);
  assert.equal(funded.lastRun?.debited, 1);
  assert.equal(funded.lastRun?.secured, 1);
  assert.equal(funded.circles[0].schedule[0].funding?.payments.length, 3);
});

test('paused circles and fully billed circles cause no new deductions', () => {
  const before = fixture();
  before.circles[0].autoDebit = false;
  const paused = simulateBilling(before, stamp);
  assert.equal(paused.transactions.length, 0);
  assert.equal(paused.lastRun?.skipped, 1);
  before.circles[0].autoDebit = true;
  const full = simulateBilling(simulateBilling(simulateBilling(before, stamp), stamp), stamp);
  const retry = simulateBilling(full, stamp);
  assert.equal(retry.transactions.length, full.transactions.length);
  assert.equal(total(retry), total(before));
});

test('manual contribution is recognized instead of charged a second time', () => {
  const before = fixture();
  before.circles[0].schedule[0].paid = true;
  const after = simulateBilling(before, stamp);
  assert.equal(after.wallets[0].balance, before.wallets[0].balance);
  assert.equal(after.lastRun?.debited, 2);
  assert.equal(after.circles[0].schedule[0].funding?.payments.length, 3);
});

test('saved simulation survives JSON roundtrip and shares participant wallets across circles', () => {
  const before = fixture();
  before.circles.push(buildCircle({ name: 'Second', amount: 50, months: 3, startDate: '2026-12-01' }));
  const after = simulateBilling(before, stamp);
  const restored = JSON.parse(JSON.stringify(after));
  assert.equal(restored.wallets.find((w: {member: string}) => w.member === 'Ahmed').balance, 1409.875);
  assert.equal(restored.circles[0].schedule[0].funding.queuedAt, stamp);
  assert.equal(total(after), total(before));
});
