import { CalendarClock, Landmark, Lock, PauseCircle, PlayCircle, ShieldAlert, ShieldCheck, Wallet as WalletIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { circleGoal, circleStats, displayMember, fmtDate, fmtKWD, statusOf, type Circle, type MonthEntry, type MonthStatus } from '@/lib/circles';
import { fundingMessage, heldForCircle, jointAccountsForUser } from '@/lib/funding';

/** Automated partial months stay Pending until every receipt is in. */
export const displayStatus = (e: MonthEntry): MonthStatus =>
  e.funding && !e.collected && !e.funding.queuedAt ? 'Pending' : statusOf(e);

export const hasHeldFunds = (c: Circle) => c.schedule.some((e) => !e.collected && (e.funding?.payments.length ?? 0) > 0);
import type { CirclesApi } from '@/hooks/use-circles';
import { cn } from '@/lib/utils';
import { Initials } from './bits';

export const fmtStamp = (iso?: string) => {
  if (!iso) return '';
  try { return format(parseISO(iso), 'd MMM yyyy, HH:mm'); } catch { return iso; }
};

/** Month the automation is currently working on: the first non-collected entry. */
export function vaultInfo(circle: Circle) {
  const s = circleStats(circle);
  const e: MonthEntry | null = s.current;
  const payments = e?.funding?.payments ?? [];
  const currentHeld = e && !e.collected && !e.funding?.releasedAt ? payments.reduce((a, p) => a + p.amount, 0) : 0;
  const held = heldForCircle(circle);
  const queuedCount = circle.schedule.filter((m) => m.funding?.queuedAt && !m.collected).length;
  const target = circle.amount * circle.members.length;
  return {
    entry: e,
    payments,
    held,
    currentHeld,
    queuedCount,
    target,
    paidCount: payments.length,
    total: circle.members.length,
    queued: !!e?.funding?.queuedAt && !e.collected,
    complete: s.complete,
  };
}

export function SimNote({ className }: { className?: string }) {
  return (
    <p className={cn('flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground', className)}>
      <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
      Simulation only. Protected balances are mock funds, not real deposits or a bank connection.
    </p>
  );
}

export function VaultMeter({ circle, compact }: { circle: Circle; compact?: boolean }) {
  const v = vaultInfo(circle);
  if (v.complete) return null;
  const pct = v.target ? v.currentHeld / v.target : 0;
  return (
    <div className={cn('rounded-xl border border-dashed border-primary/25 bg-accent/40', compact ? 'p-3' : 'p-4')} data-testid={`vault-${circle.id}`}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-primary"><Lock className="h-3.5 w-3.5" aria-hidden /> Protected balance</span>
        <span className="num font-semibold" data-testid={`text-vault-held-${circle.id}`}>{fmtKWD(v.held)}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
        <div className="h-full origin-left rounded-full bg-primary transition-transform duration-700" style={{ transform: `scaleX(${Math.max(0.0001, pct)})` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="num">M{v.entry?.month}: {v.paidCount}/{v.total} funded</span>
        <span className={cn('truncate', v.queued && 'font-semibold text-teal-800')}>
          {v.queued ? `Queued for ${displayMember(v.entry?.recipient ?? '')}` : `For ${displayMember(v.entry?.recipient ?? '')}`}
        </span>
      </div>
      {v.queuedCount > 1 && <p className="mt-1 text-[11px] text-primary">{v.queuedCount} monthly payouts queued</p>}
    </div>
  );
}

export function AutoDebitToggle({ circle, onToggle }: { circle: Circle; onToggle: (id: string, enabled: boolean) => void }) {
  const done = circleStats(circle).complete;
  if (done) {
    return <p className="text-xs font-medium text-muted-foreground">Rotation complete, auto-debit off</p>;
  }
  const id = `auto-${circle.id}`;
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-semibold">Auto-Debit Subscription</span>
        <span className={cn('flex items-center gap-1 text-xs', circle.autoDebit ? 'text-primary' : 'text-amber-700')} data-testid={`text-autodebit-status-${circle.id}`}>
          {circle.autoDebit ? <PlayCircle className="h-3 w-3" aria-hidden /> : <PauseCircle className="h-3 w-3" aria-hidden />}
          {circle.autoDebit ? 'Active, debits monthly' : 'Paused, skipped by simulator'}
        </span>
      </label>
      <Switch id={id} checked={circle.autoDebit} onCheckedChange={(v) => onToggle(circle.id, v)} data-testid={`switch-autodebit-${circle.id}`} />
    </div>
  );
}

export function LinkedAccounts({ api }: { api: CirclesApi }) {
  const accounts = jointAccountsForUser(api.circles);
  return (
    <div className="space-y-7">
      <header className="rise">
        <h1 className="text-3xl font-extrabold tracking-tight">Joint Accounts</h1>
        <p className="mt-1 max-w-lg text-muted-foreground">One separate joint account for each savings circle. Each balance and payment schedule belongs only to that circle.</p>
        <SimNote className="mt-3" />
      </header>

      {accounts.length === 0 && (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          No joint accounts yet. Create a savings circle to open its demo joint account.
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {accounts.map(({ circle, balance, nextDue }, index) => (
        <section key={circle.id} style={{ animationDelay: `${index * 60}ms` }} className="rise relative min-w-0 overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8" data-testid={`card-joint-account-${circle.id}`}>
          <div aria-hidden className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full border-[26px] border-white/5" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">Joint account (mock)</p>
              <h2 className="mt-2 break-words text-xl font-bold">{circle.name}</h2>
              <p className="mt-2 flex items-center gap-2 text-xs text-primary-foreground/75"><Landmark className="h-4 w-4 shrink-0" aria-hidden /> National Bank of Kuwait</p>
            </div>
            <span className="rounded-full border border-dashed border-white/40 px-2.5 py-0.5 text-[11px] font-semibold">Simulated</span>
          </div>
          <p className="num mt-4 break-all text-[10px] text-primary-foreground/65">Account reference: JD-{circle.id}</p>
          <div className="relative mt-6">
            <p className="text-sm text-primary-foreground/75">Protected balance</p>
            <p className="num mt-1 break-words text-3xl font-semibold" data-testid={`text-joint-balance-${circle.id}`}>{fmtKWD(balance)}</p>
            <p className="mt-2 text-xs text-primary-foreground/75">Savings goal: <span className="num font-semibold">{fmtKWD(circleGoal(circle))}</span></p>
          </div>
          <p className="relative mt-3 text-[11px] text-primary-foreground/65">Only this circle’s deposited contributions. Personal wallet funds and other circles are not included.</p>
          <div className="relative mt-6 border-t border-white/20 pt-5">
            <h2 className="flex items-center gap-2 text-sm font-bold"><CalendarClock className="h-4 w-4" /> Payment due dates</h2>
            {!nextDue ? <p className="mt-3 text-sm text-primary-foreground/75">All contributions paid. No payments due.</p> : (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm" data-testid={`next-payment-due-${circle.id}`}>
                <div><p className="font-semibold">Month {nextDue.month}</p><p className="text-xs text-primary-foreground/70">{circle.autoDebit ? 'Auto-debit active' : 'Auto-debit paused'}</p></div>
                <div className="text-right"><p className="font-semibold">{fmtDate(nextDue.date)}</p><p className="text-xs text-primary-foreground/70">{nextDue.date < api.simulatedDate ? 'Overdue in demo' : nextDue.date === api.simulatedDate ? 'Due today' : 'Upcoming'}</p></div>
              </div>
            )}
          </div>
          <div className="relative mt-6 border-t border-white/20 pt-5">
            <h3 className="text-sm font-bold">Circle members</h3>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {circle.members.map((member) => (
                <li key={member} className="flex min-w-0 items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm" data-testid={`joint-member-${circle.id}-${displayMember(member)}`}>
                  <Initials name={member} size="sm" highlight={displayMember(member) === 'User'} />
                  <span className="truncate font-medium">{displayMember(member)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
      </div>
    </div>
  );
}

export function DemoControlBar({ api }: { api: CirclesApi }) {
  const r = api.lastRun;
  const summary = r
    ? `${r.debited} debited, ${r.secured} vault${r.secured === 1 ? '' : 's'} secured, ${r.failed} failed, ${r.skipped} skipped`
    : 'No run yet. Each run debits every enabled circle once.';
  return (
    <div className="fixed inset-x-2 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 lg:inset-x-auto lg:bottom-4 lg:left-[calc(16rem+2.5rem)] lg:right-10" role="region" aria-label="Demo control bar">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 rounded-2xl border border-primary/20 bg-card/95 p-2.5 shadow-[0_12px_32px_-12px_hsl(160_50%_15%/0.35)] backdrop-blur sm:flex-row sm:items-center sm:gap-4 sm:p-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
            <span className="font-bold uppercase tracking-wider text-primary">Demo billing date</span>
            <span className="num font-semibold text-foreground" data-testid="text-simulated-date">{api.simulatedDate}</span>
            {r && <span className="num">· last run {fmtStamp(r.timestamp)}</span>}
          </div>
          <p aria-live="polite" className="truncate text-xs font-medium" data-testid="text-last-run">{summary}</p>
          <p className="text-[10px] leading-snug text-muted-foreground">Simulated clock: runs only when you click. Nothing executes while the app is closed. Protected balances are simulated; no real money or bank.</p>
        </div>
        <Button onClick={() => api.simulateNextMonth()} className="h-10 shrink-0 rounded-xl" data-testid="button-simulate-month">
          <WalletIcon className="mr-1.5 h-4 w-4" aria-hidden /> Simulate Next Month's Auto-Debit
        </Button>
      </div>
    </div>
  );
}

export function ProtectedBalancePanel({ circle, api }: { circle: Circle; api: CirclesApi }) {
  const v = vaultInfo(circle);
  const txs = api.transactions.filter((t) => t.circleId === circle.id).slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const monthTx = v.entry ? txs.filter((t) => t.month === v.entry!.month) : [];
  const failed = monthTx.filter((t) => t.kind === 'failed');
  const paidSet = new Set(v.payments.map((p) => p.member));
  const pct = v.target ? v.currentHeld / v.target : 0;

  return (
    <section className="rise grid gap-4 lg:grid-cols-[1.1fr_1fr]" style={{ animationDelay: '40ms' }}>
      <div className="rounded-3xl border-2 border-primary/30 bg-card p-5 sm:p-6" data-testid="section-protected-balance">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primary"><Lock className="h-3.5 w-3.5" aria-hidden /> Protected balance</p>
            <p className="num mt-2 text-3xl font-semibold" data-testid="text-vault-held">{fmtKWD(v.held)}</p>
            <p className="text-xs text-muted-foreground">Total held across all monthly vaults · {v.queuedCount} payouts queued</p>
            <p className="num mt-1 text-xs text-muted-foreground">{fmtKWD(v.currentHeld)} of {fmtKWD(v.target)} {v.entry ? `for month ${v.entry.month}` : ''}</p>
          </div>
          <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
            v.complete ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
              : v.queued ? 'bg-teal-50 text-teal-900 ring-teal-300'
              : !circle.autoDebit ? 'bg-amber-50 text-amber-800 ring-amber-200'
              : 'bg-muted text-muted-foreground ring-border')} data-testid="text-vault-state">
            {v.complete ? 'All released' : v.queued ? 'Held, payout queued' : !circle.autoDebit ? 'Auto-debit paused' : v.held > 0 ? 'Held, collecting' : 'Empty'}
          </span>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full origin-left rounded-full bg-primary transition-transform duration-700" style={{ transform: `scaleX(${Math.max(0.0001, pct)})` }} />
        </div>
        {!v.complete && v.entry && (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              <span className="num font-semibold text-foreground">{v.paidCount}/{v.total}</span> participants debited.
              {v.queued ? <> Full pot secured and queued for <b className="text-foreground">{displayMember(v.entry.recipient)}</b>. Funds stay held until the transfer completes.</>
                : <> Recipient <b className="text-foreground">{displayMember(v.entry.recipient)}</b> receives the pot once the vault is full.</>}
            </p>
            <ul className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {circle.members.map((m) => {
                const p = v.payments.find((x) => x.member === m);
                const f = !paidSet.has(m) && failed.find((t) => t.member === m);
                return (
                  <li key={m} className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs" data-testid={`receipt-${m}`}>
                    <Initials name={m} size="sm" highlight={m === 'Ahmed'} />
                    <span className="min-w-0 flex-1 truncate font-medium">{displayMember(m)}</span>
                    {p ? <span className="text-right text-primary"><ShieldCheck className="mr-0.5 inline h-3 w-3" aria-hidden /><span className="num">{fmtStamp(p.timestamp)}</span></span>
                      : f ? <span className="font-semibold text-destructive">Failed</span>
                      : <span className="text-muted-foreground">Awaiting</span>}
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <SimNote className="mt-4" />
      </div>

      <div className="rounded-3xl border bg-card p-5 sm:p-6">
        <h3 className="font-bold tracking-tight">Funding history</h3>
        <p className="text-xs text-muted-foreground">Debits and queued pots are held. Transfers are released.</p>
        {txs.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No automated activity yet. Use the demo bar below to run a billing cycle.</p>
        ) : (
          <ol className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1" data-testid="list-transactions">
            {txs.map((t) => (
              <li key={t.id} className="flex gap-3 rounded-xl border px-3 py-2 text-xs">
                <span className={cn('mt-0.5 h-fit shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                  t.kind === 'transfer' ? 'bg-emerald-100 text-emerald-800' : t.kind === 'failed' ? 'bg-red-100 text-red-800' : t.kind === 'queued' ? 'bg-teal-100 text-teal-900' : 'bg-sky-100 text-sky-800')}>
                  {t.kind === 'transfer' ? 'Released' : t.kind === 'queued' ? 'Queued' : t.kind === 'failed' ? 'Failed' : 'Held'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{fundingMessage(t.message)}</p>
                  <p className="num text-muted-foreground">M{t.month} · {displayMember(t.member)} · {fmtStamp(t.timestamp)}</p>
                </div>
                <span className="num shrink-0 font-semibold">{fmtKWD(t.amount)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
