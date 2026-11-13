import { CalendarClock, Landmark, Lock, PauseCircle, PlayCircle, ShieldAlert, ShieldCheck, Wallet as WalletIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { circleStats, displayMember, fmtDate, fmtKWD, statusOf, type Circle, type MonthEntry, type MonthStatus } from '@/lib/circles';
import { heldForCircle } from '@/lib/funding';

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
      Simulation only. No real money, no real escrow, no bank connection.
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
        <span className="flex items-center gap-1.5 font-semibold text-primary"><Lock className="h-3.5 w-3.5" aria-hidden /> Total escrow held</span>
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
  const me = api.wallets.find((w) => w.member === 'Ahmed');
  const jointBalance = api.wallets.reduce((sum, w) => sum + w.balance, 0);
  const duePayments = api.circles.map((circle) => ({
    circle,
    entry: circle.schedule.find((e) => !e.collected && (e.funding ? !e.funding.queuedAt : !e.paid)),
  })).filter((item) => item.entry).sort((a, b) => a.entry!.date.localeCompare(b.entry!.date));
  return (
    <div className="space-y-7">
      <header className="rise">
        <h1 className="text-3xl font-extrabold tracking-tight">Joint Bank Account</h1>
        <p className="mt-1 max-w-lg text-muted-foreground">Your circle members, combined demo balance, and upcoming payment dates in one place.</p>
        <SimNote className="mt-3" />
      </header>

      {me && (
        <section className="rise relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8" data-testid="card-joint-account">
          <div aria-hidden className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full border-[26px] border-white/5" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">Joint bank account (mock)</p>
              <p className="mt-2 flex items-center gap-2 text-lg font-bold"><Landmark className="h-5 w-5" aria-hidden /> {me.bank}</p>
            </div>
            <span className="rounded-full border border-dashed border-white/40 px-2.5 py-0.5 text-[11px] font-semibold">Simulated</span>
          </div>
          <p className="num mt-8 text-xl tracking-widest" data-testid="text-joint-card">**** **** **** {me.last4}</p>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs text-primary-foreground/65">User & circle members</p>
              <p className="text-xs text-primary-foreground/65">Combined demo wallet balance</p>
            </div>
            <p className="num text-2xl font-semibold sm:text-3xl" data-testid="text-joint-balance">{fmtKWD(jointBalance)}</p>
          </div>
          <p className="mt-3 text-[11px] text-primary-foreground/65">Combined participant wallet balances, not an additional deposit. Funds held in escrow are shown in each circle.</p>
          <div className="mt-6 border-t border-white/20 pt-5">
            <h2 className="flex items-center gap-2 text-sm font-bold"><CalendarClock className="h-4 w-4" /> Payment due dates</h2>
            {duePayments.length === 0 ? <p className="mt-3 text-sm text-primary-foreground/75">All contributions paid. No payments due.</p> : (
              <ul className="mt-3 space-y-3" data-testid="list-payment-due-dates">
                {duePayments.map(({ circle, entry }) => (
                  <li key={circle.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div><p className="font-semibold">{circle.name}</p><p className="text-xs text-primary-foreground/70">Month {entry!.month} · {circle.autoDebit ? 'Auto-debit active' : 'Auto-debit paused'}</p></div>
                    <div className="text-right"><p className="font-semibold">{fmtDate(entry!.date)}</p><p className="text-xs text-primary-foreground/70">{entry!.date < api.simulatedDate ? 'Overdue in demo' : entry!.date === api.simulatedDate ? 'Due today' : 'Upcoming'}</p></div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <section className="rise" style={{ animationDelay: '80ms' }}>
        <h2 className="mb-3 text-lg font-bold tracking-tight">Account members</h2>
        {api.wallets.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card/60 p-8 text-center text-sm text-muted-foreground">No participant wallets yet. Create a circle to add members.</div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {api.wallets.map((w) => (
              <li key={w.member} className="flex items-center gap-3 rounded-2xl border bg-card p-4" data-testid={`card-wallet-${displayMember(w.member)}`}>
                <Initials name={w.member} highlight={w.member === 'Ahmed'} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{displayMember(w.member)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
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
          <p className="text-[10px] leading-snug text-muted-foreground">Simulated clock: runs only when you click. Nothing executes while the app is closed. No real money, escrow or bank.</p>
        </div>
        <Button onClick={() => api.simulateNextMonth()} className="h-10 shrink-0 rounded-xl" data-testid="button-simulate-month">
          <WalletIcon className="mr-1.5 h-4 w-4" aria-hidden /> Simulate Next Month's Auto-Debit
        </Button>
      </div>
    </div>
  );
}

export function EscrowVault({ circle, api }: { circle: Circle; api: CirclesApi }) {
  const v = vaultInfo(circle);
  const txs = api.transactions.filter((t) => t.circleId === circle.id).slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const monthTx = v.entry ? txs.filter((t) => t.month === v.entry!.month) : [];
  const failed = monthTx.filter((t) => t.kind === 'failed');
  const paidSet = new Set(v.payments.map((p) => p.member));
  const pct = v.target ? v.currentHeld / v.target : 0;

  return (
    <section className="rise grid gap-4 lg:grid-cols-[1.1fr_1fr]" style={{ animationDelay: '40ms' }}>
      <div className="rounded-3xl border-2 border-primary/30 bg-card p-5 sm:p-6" data-testid="section-escrow-vault">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primary"><Lock className="h-3.5 w-3.5" aria-hidden /> Escrow Holding Vault</p>
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
                  <p className="font-medium">{t.message}</p>
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
