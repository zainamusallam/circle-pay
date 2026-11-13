import { format } from 'date-fns';
import { displayMember, seedCircles, type Circle } from './circles';

export const INITIAL_BALANCE = 1500;
export type Wallet = { member: string; bank: string; last4: string; balance: number };
export type FundingTransaction = {
  id: string; circleId: string; circleName: string; month: number; member: string;
  kind: 'debit' | 'queued' | 'transfer' | 'failed';
  amount: number; timestamp: string; message: string;
};
export type FundingState = {
  circles: Circle[];
  wallets: Wallet[];
  transactions: FundingTransaction[];
  simulatedDate: string;
  lastRun: { timestamp: string; debited: number; secured: number; failed: number; skipped: number } | null;
};
const money = (n: number) => Math.round(n * 1000) / 1000;

export function ensureWallets(circles: Circle[], wallets: Wallet[] = []): Wallet[] {
  const result = wallets.map((w) => ({ ...w }));
  for (const member of new Set(['Ahmed', ...circles.flatMap((c) => c.members)])) {
    if (!result.some((w) => w.member === member)) result.push({
      member, bank: 'National Bank of Kuwait',
      last4: member === 'Ahmed' ? '4892' : String(5000 + result.length * 137).slice(-4),
      balance: INITIAL_BALANCE,
    });
  }
  return result;
}

export function initialFunding(circles = seedCircles()): FundingState {
  return {
    circles: circles.map((c) => ({ ...c, autoDebit: c.autoDebit ?? true })),
    wallets: ensureWallets(circles), transactions: [],
    simulatedDate: format(new Date(), 'yyyy-MM-dd'), lastRun: null,
  };
}

export function heldForCircle(circle: Circle): number {
  return money(circle.schedule.reduce((sum, e) =>
    sum + (e.collected ? 0 : (e.funding?.payments.reduce((s, p) => s + p.amount, 0) ?? 0)), 0));
}

/** Joint accounts contain only the funds deposited into their own circle. */
export function jointAccountsForUser(circles: Circle[]) {
  return circles.filter((c) => c.members.some((m) => displayMember(m) === 'User')).map((circle) => ({
    circle,
    balance: heldForCircle(circle),
    nextDue: circle.schedule.find((e) => !e.collected && (e.funding ? !e.funding.queuedAt : !e.paid)) ?? null,
  }));
}

/** Apply current presentation wording to saved transaction messages too. */
export const fundingMessage = (message: string) =>
  message.replace(/\bescrow(?: vault)?\b/gi, 'protected balance');

/** One simulated billing cycle per enabled circle. Retries never charge a receipt twice. */
export function simulateBilling(state: FundingState, timestamp: string): FundingState {
  const wallets = ensureWallets(state.circles, state.wallets);
  const transactions = [...state.transactions];
  const report = { timestamp, debited: 0, secured: 0, failed: 0, skipped: 0 };
  let simulatedDate = state.simulatedDate;
  const circles = state.circles.map((c): Circle => {
    if (!c.autoDebit) { report.skipped++; return c; }
    const target = c.schedule.find((e) => !e.collected && !e.funding?.queuedAt);
    if (!target) { report.skipped++; return c; }
    if (target.date > simulatedDate) simulatedDate = target.date;
    const funding = {
      ...target.funding,
      payments: [...(target.funding?.payments ?? [])],
    };
    const log = (member: string, kind: FundingTransaction['kind'], amount: number, message: string) => {
      transactions.push({
        id: `${c.id}:${target.month}:${member}:${kind}:${transactions.length}`,
        circleId: c.id, circleName: c.name, month: target.month,
        member, kind, amount, timestamp, message,
      });
    };
    for (const member of c.members) {
      if (funding.payments.some((p) => p.member === member)) continue;
      const wallet = wallets.find((w) => w.member === member)!;
      // A previously recorded manual contribution must not be charged again.
      if (member === 'Ahmed' && target.paid) {
        funding.payments.push({ member, amount: c.amount, timestamp });
        continue;
      }
      if (money(wallet.balance) < c.amount) {
        report.failed++;
        log(member, 'failed', c.amount, 'Insufficient demo wallet balance; no deduction made.');
        continue;
      }
      wallet.balance = money(wallet.balance - c.amount);
      funding.payments.push({ member, amount: c.amount, timestamp });
      report.debited++;
      log(member, 'debit', c.amount, 'Auto-debit deposited into the simulated protected balance.');
    }
    if (funding.payments.length === c.members.length) {
      funding.queuedAt = timestamp;
      report.secured++;
      log(target.recipient, 'queued', money(c.amount * c.members.length),
        'All contributions secured. Demo transfer queued to designated recipient.');
    }
    return {
      ...c,
      schedule: c.schedule.map((e) => e.month !== target.month ? e : {
        ...e, funding, paid: funding.payments.some((p) => p.member === 'Ahmed'),
      }),
    };
  });
  return { circles, wallets, transactions, simulatedDate, lastRun: report };
}

/** Releases only a fully funded current-month vault, with an idempotent wallet credit. */
export function collectMonth(state: FundingState, id: string, month: number, timestamp: string): FundingState {
  const c = state.circles.find((x) => x.id === id);
  const entry = c?.schedule.find((e) => e.month === month);
  if (!c || !entry || entry.collected || !entry.paid ||
      c.schedule.find((e) => !e.collected)?.month !== month) return state;
  if (entry.funding && !entry.funding.queuedAt) return state;
  const wallets = ensureWallets(state.circles, state.wallets);
  const transactions = [...state.transactions];
  if (entry.funding) {
    const amount = money(entry.funding.payments.reduce((sum, p) => sum + p.amount, 0));
    const recipient = wallets.find((w) => w.member === entry.recipient)!;
    recipient.balance = money(recipient.balance + amount);
    transactions.push({
      id: `${id}:${month}:transfer`, circleId: id, circleName: c.name, month,
      member: entry.recipient, kind: 'transfer', amount, timestamp,
      message: 'Simulated protected balance released to recipient wallet.',
    });
  }
  return {
    ...state, wallets, transactions,
    circles: state.circles.map((x) => x.id !== id ? x : {
      ...x, schedule: x.schedule.map((e) => e.month !== month ? e : {
        ...e, collected: true,
        funding: e.funding ? { ...e.funding, releasedAt: timestamp } : undefined,
      }),
    }),
  };
}
