import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCircle, circleGoal, circleStats, contributionFor, seedCircles, statusOf } from './circles';
import { collectMonth, ensureWallets, fundingMessage, heldForCircle, INITIAL_BALANCE, initialFunding, jointAccountsForUser, simulateBilling } from './funding';
import { upgradeFundingState } from './funding-migration';

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
  assert.equal(statusOf(after.circles[0].schedule[0]), 'Auto-Paid (Protected Balance Secured)');
  assert.equal(after.transactions.length, 4);
  assert.equal(after.simulatedDate, '2026-12-01');
  assert.equal(before.wallets[0].balance, INITIAL_BALANCE);
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
  assert.equal(released.wallets.find((w) => w.member === 'Ahmed')!.balance, INITIAL_BALANCE + 40.125);
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
  assert.equal(restored.wallets.find((w: {member: string}) => w.member === 'Ahmed').balance, INITIAL_BALANCE - 90.125);
  assert.equal(restored.circles[0].schedule[0].funding.queuedAt, stamp);
  assert.equal(total(after), total(before));
});

test('two circles create two separate joint accounts, not pooled wallet totals', () => {
  const before = fixture();
  before.circles.push(buildCircle({ name: 'Second circle', amount: 100, months: 3, startDate: '2026-12-01' }));
  assert.equal(jointAccountsForUser(before.circles).length, 2);
  assert.deepEqual(jointAccountsForUser(before.circles).map((a) => a.balance), [0, 0]);
  const funded = simulateBilling(before, stamp);
  assert.deepEqual(jointAccountsForUser(funded.circles).map((a) => a.balance), [120.375, 300]);
  const released = collectMonth(funded, funded.circles[0].id, 1, stamp);
  assert.deepEqual(jointAccountsForUser(released.circles).map((a) => a.balance), [0, 300]);
  assert.equal(jointAccountsForUser(released.circles)[0].nextDue?.month, 2);
});

test('joint accounts follow membership as circles are created or removed', () => {
  const before = fixture();
  const second = buildCircle({ name: 'Second', amount: 10, months: 2, startDate: '2026-12-01' });
  const third = buildCircle({ name: 'Third', amount: 20, months: 2, startDate: '2026-12-01' });
  const unrelated = buildCircle({ name: 'Not a member', amount: 30, months: 2, startDate: '2026-12-01', members: ['Omar', 'Sara'] });
  assert.equal(jointAccountsForUser([...before.circles, second, third, unrelated]).length, 3);
  assert.equal(jointAccountsForUser([third, unrelated]).length, 1);
  assert.equal(jointAccountsForUser([]).length, 0);
});

test('previously saved messages use protected balance terminology on display', () => {
  assert.equal(fundingMessage('Auto-debit deposited into the simulated escrow vault.'), 'Auto-debit deposited into the simulated protected balance.');
  assert.equal(fundingMessage('Simulated escrow released to recipient wallet.'), 'Simulated protected balance released to recipient wallet.');
});

test('7000 KWD divided among seven participants charges exactly 1000 each', () => {
  const c = buildCircle({ name: 'Seven', goal: 7000, months: 7, startDate: '2026-12-01' });
  const before = initialFunding([c]);
  const after = simulateBilling(before, stamp);
  assert.equal(circleGoal(c), 7000);
  assert.equal(contributionFor(c), 1000);
  assert.deepEqual(c.members.map((m) => contributionFor(c, m)), Array(7).fill(1000));
  assert.equal(after.lastRun?.debited, 7);
  assert.equal(heldForCircle(after.circles[0]), 7000);
  assert.equal(circleStats(after.circles[0]).contributed, 1000);
  assert.deepEqual(after.transactions.filter((t) => t.kind === 'debit').map((t) => t.amount), Array(7).fill(1000));
  assert.equal(after.transactions.find((t) => t.kind === 'queued')?.amount, 7000);
  assert.equal(total(after), total(before));
});

test('uneven splits differ by one fils at most and fund the exact goal', () => {
  const c = buildCircle({ name: 'Rounding', goal: 1000, months: 3, startDate: '2026-12-01' });
  assert.deepEqual(c.members.map((m) => contributionFor(c, m)), [333.334, 333.333, 333.333]);
  const before = initialFunding([c]);
  const after = simulateBilling(before, stamp);
  assert.equal(heldForCircle(after.circles[0]), 1000);
  assert.equal(total(after), total(before));
});

test('seeded goals, member counts and historical contributions agree', () => {
  const state = initialFunding();
  const family = state.circles.find((c) => c.id === 'family-friends')!;
  const office = state.circles.find((c) => c.id === 'office-colleagues')!;
  assert.equal(contributionFor(family), 500);
  assert.equal(office.members.length, 7);
  assert.equal(office.schedule.length, 7);
  assert.equal(contributionFor(office), 1000);
  assert.equal(circleStats(office).contributed, 1000);
  assert.equal(state.transactions.find((t) => t.circleId === office.id && t.kind === 'transfer')?.amount, 7000);
  assert.equal(total(state), state.wallets.length * INITIAL_BALANCE * 1000);
});

test('old saved demo receipts, history and wallets are repriced together exactly once', () => {
  const legacy = seedCircles().find((c) => c.id === 'office-colleagues')!;
  delete legacy.goal;
  legacy.members = legacy.members.slice(0, 6);
  legacy.months = 6;
  legacy.amount = 100;
  legacy.schedule = legacy.schedule.slice(0, 6).map((e, i) => ({
    ...e, collected: false, paid: i === 0,
    funding: i === 0 ? {
      payments: legacy.members.map((member) => ({ member, amount: 100, timestamp: stamp })),
      queuedAt: stamp,
    } : undefined,
  }));
  const migrated = upgradeFundingState({
    circles: [legacy], wallets: ensureWallets([legacy]), transactions: [],
    simulatedDate: '2026-11-13', lastRun: null,
  });
  const c = migrated.circles[0];
  assert.equal(c.members.length, 7);
  assert.equal(c.schedule[0].funding?.payments.length, 7);
  assert.equal(heldForCircle(c), 7000);
  assert.equal(c.schedule[0].funding?.queuedAt, stamp);
  assert.equal(circleStats(c).contributed, 1000);
  assert.equal(migrated.transactions.filter((t) => t.kind === 'debit').length, 7);
  assert.equal(total(migrated), migrated.wallets.length * INITIAL_BALANCE * 1000);
  assert.equal(upgradeFundingState(migrated), migrated);
});
