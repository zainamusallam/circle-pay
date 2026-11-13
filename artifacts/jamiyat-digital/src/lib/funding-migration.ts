import { addMonths, format, parseISO } from 'date-fns';
import { circleGoal, contributionFor, type Circle } from './circles';
import type { FundingState, FundingTransaction } from './funding';

/**
 * Reconcile the local demo's old illustrative amounts with goal-based equal shares.
 * Preserve circles, dates, statuses, receipts and their timestamps; reprice the
 * corresponding history and wallet effects together, rather than changing labels only.
 */
export function upgradeFundingState(state: FundingState, openingBalance = 15000): FundingState {
  if (state.calculationVersion === 2) return state;
  const wallets = state.wallets.map((w) => ({ ...w, balance: openingBalance }));
  const transactions: FundingTransaction[] = [];
  const money = (n: number) => Math.round(n * 1000) / 1000;
  const circles = state.circles.map((original): Circle => {
    const members = [...original.members];
    const schedule = original.schedule.map((e) => ({ ...e }));
    // The 7,000 KWD example now has seven equal-paying participants and turns.
    if (original.id === 'office-colleagues' && members.length === 6) {
      const member = ['Sara', 'Fatima', 'Dana'].find((m) => !members.includes(m))!;
      members.push(member);
      schedule.push({
        month: 7, date: format(addMonths(parseISO(original.startDate), 6), 'yyyy-MM-dd'),
        recipient: member, paid: false, collected: false,
      });
    }
    const c: Circle = {
      ...original, members, schedule, months: members.length,
      goal: circleGoal(original), autoDebit: original.autoDebit ?? true,
    };
    c.amount = contributionFor(c);
    for (const member of members) {
      if (!wallets.some((w) => w.member === member)) wallets.push({
        member, bank: 'National Bank of Kuwait',
        last4: String(5000 + wallets.length * 137).slice(-4), balance: openingBalance,
      });
    }
    c.schedule = schedule.map((entry) => {
      if (!entry.paid && !entry.collected && !entry.funding) return entry;
      const historicalTimestamp = `${entry.date}T12:00:00.000Z`;
      const full = entry.collected || !!entry.funding?.queuedAt;
      const paidMembers = full ? members
        : entry.funding ? entry.funding.payments.map((p) => p.member)
        : ['Ahmed'];
      const payments = [...new Set(paidMembers)].filter((member) => members.includes(member)).map((member) => ({
        member, amount: contributionFor(c, member),
        timestamp: entry.funding?.payments.find((p) => p.member === member)?.timestamp
          ?? entry.funding?.queuedAt ?? historicalTimestamp,
      }));
      const log = (kind: FundingTransaction['kind'], member: string, amount: number, timestamp: string, message: string) =>
        transactions.push({
          id: `${c.id}:${entry.month}:${member}:${kind}`, circleId: c.id,
          circleName: c.name, month: entry.month, member, amount, timestamp, kind, message,
        });
      for (const payment of payments) {
        const wallet = wallets.find((w) => w.member === payment.member)!;
        wallet.balance = money(wallet.balance - payment.amount);
        log('debit', payment.member, payment.amount, payment.timestamp,
          entry.funding ? 'Contribution deposited into the simulated protected balance.'
            : 'Historical demo contribution recorded in the protected balance.');
      }
      const queuedAt = full ? entry.funding?.queuedAt ?? historicalTimestamp : undefined;
      const releasedAt = entry.collected ? entry.funding?.releasedAt ?? queuedAt : undefined;
      if (queuedAt) log('queued', entry.recipient, circleGoal(c), queuedAt,
        'All equal participant contributions secured. Demo transfer queued.');
      if (releasedAt) {
        const recipient = wallets.find((w) => w.member === entry.recipient)!;
        recipient.balance = money(recipient.balance + circleGoal(c));
        log('transfer', entry.recipient, circleGoal(c), releasedAt,
          'Simulated protected balance released to recipient wallet.');
      }
      return {
        ...entry, paid: payments.some((p) => p.member === 'Ahmed'),
        funding: { payments, queuedAt, releasedAt },
      };
    });
    return c;
  });
  // Keep failed attempts as attempts, not deposits, using the corrected share.
  for (const tx of state.transactions.filter((t) => t.kind === 'failed')) {
    const c = circles.find((x) => x.id === tx.circleId);
    if (c) transactions.push({ ...tx, amount: contributionFor(c, tx.member) });
  }
  return { ...state, circles, wallets, transactions, calculationVersion: 2, lastRun: null };
}
