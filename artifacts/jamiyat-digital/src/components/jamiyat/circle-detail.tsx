import { ArrowLeft, Check, HandCoins, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { circleGoal, circleStats, contributionFor, displayMember, fmtDate, fmtKWD, type Circle, type MonthEntry } from '@/lib/circles';
import type { CirclesApi } from '@/hooks/use-circles';
import { cn } from '@/lib/utils';
import { Initials, ProgressBar, StatusBadge } from './bits';
import { AutoDebitToggle, FundingHistoryPanel, displayStatus, fmtStamp, hasHeldFunds } from './funding-ui';

type Props = { circle: Circle; api: CirclesApi; onBack: () => void };

export function CircleDetail({ circle, api, onBack }: Props) {
  const { toast } = useToast();
  const s = circleStats(circle);
  const goal = circleGoal(circle);
  const pot = goal;
  const n = circle.members.length;
  const share = contributionFor(circle);
  const exact = Math.round(goal * 1000) % n === 0;

  const actions = (e: MonthEntry) => {
    const isCurrent = s.current?.month === e.month;
    const auto = !!e.funding;
    if (auto && e.collected) {
      return <span className="text-xs font-medium text-emerald-700" data-testid={`text-released-${e.month}`}>Released{e.funding?.releasedAt ? ` ${fmtStamp(e.funding.releasedAt)}` : ''}</span>;
    }
    if (auto && e.funding?.queuedAt) {
      return isCurrent ? (
        <Button size="sm" className="h-11 rounded-lg md:h-8" onClick={() => { api.markCollected(circle.id, e.month); toast({ title: 'Demo transfer completed', description: `${fmtKWD(pot)} released to ${displayMember(e.recipient)} (simulated).` }); }} data-testid={`button-complete-transfer-${e.month}`}>
          <HandCoins className="mr-1 h-3.5 w-3.5" /> Complete demo transfer
        </Button>
      ) : <span className="text-xs text-muted-foreground">Held, queued</span>;
    }
    if (auto && !e.collected) {
      return <span className="text-right text-xs text-amber-700" data-testid={`text-partial-${e.month}`}>{e.funding!.payments.length}/{circle.members.length} debited, funding incomplete</span>;
    }
    if (e.collected) {
      const isLastCollected = !circle.schedule.some((x) => x.month > e.month && x.collected);
      return isLastCollected ? (
        <Button size="sm" variant="ghost" className="h-11 text-muted-foreground md:h-8" onClick={() => api.undoCollected(circle.id, e.month)} data-testid={`button-undo-collect-${e.month}`}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Undo
        </Button>
      ) : <span className="text-xs text-muted-foreground">Settled</span>;
    }
    if (!e.paid) {
      return (
        <Button
          size="sm" className="h-11 rounded-lg md:h-8"
          onClick={() => { api.markPaid(circle.id, e.month); toast({ title: `Month ${e.month} marked paid`, description: `${fmtKWD(share)} contribution recorded for ${circle.name}.` }); }}
          data-testid={`button-mark-paid-${e.month}`}
        >
          <Check className="mr-1 h-3.5 w-3.5" /> Mark paid
        </Button>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm" variant="outline" disabled={!isCurrent}
          title={isCurrent ? undefined : 'Payouts are collected in rotation order'}
          className="h-11 rounded-lg border-primary/40 text-primary md:h-8"
          onClick={() => { api.markCollected(circle.id, e.month); toast({ title: `Payout collected by ${displayMember(e.recipient)}`, description: `${fmtKWD(pot)} released for month ${e.month}.` }); }}
          data-testid={`button-mark-collected-${e.month}`}
        >
          <HandCoins className="mr-1 h-3.5 w-3.5" /> Collect
        </Button>
        <Button size="sm" variant="ghost" className="h-11 min-w-11 px-2 text-muted-foreground md:h-8 md:min-w-0" aria-label={`Undo payment for month ${e.month}`} onClick={() => api.undoPaid(circle.id, e.month)} data-testid={`button-undo-paid-${e.month}`}>
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted-foreground hover:text-foreground" data-testid="button-back">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <section className="rise overflow-hidden rounded-3xl border bg-card">
        <div className="relative bg-primary px-6 py-7 text-primary-foreground sm:px-8">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border-[28px] border-white/5" />
          <div aria-hidden className="pointer-events-none absolute -right-4 top-10 h-28 w-28 rounded-full border-[14px] border-white/5" />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">Savings circle</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl" data-testid="text-circle-title">{circle.name}</h1>
          <div className="relative mt-5 rounded-2xl bg-tertiary p-4 text-tertiary-foreground shadow-[0_14px_34px_-20px_hsl(var(--tertiary)/0.8)] sm:p-5" data-testid="section-contribution">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tertiary-foreground/75">Your monthly contribution</p>
            <p className="num mt-1 text-3xl font-semibold sm:text-4xl" data-testid="text-monthly-contribution">{fmtKWD(share)}</p>
            <p className="num mt-1.5 text-sm text-tertiary-foreground/85" data-testid="text-contribution-formula">{fmtKWD(goal)} goal / {n} participants = {fmtKWD(share)} per participant per billing cycle</p>
            {!exact && <p className="mt-1 text-xs text-tertiary-foreground/75" data-testid="text-rounding-note">Rounded to the nearest fils. Some members pay 1 fils more so each cycle totals exactly {fmtKWD(goal)}.</p>}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {[
              ['Savings goal', fmtKWD(goal)],
              ['Participants', `${n} people`],
              ['You contributed', fmtKWD(s.contributed)],
              ['Your turn', s.ahmedTurn ? `Month ${s.ahmedTurn.month}` : 'Not in rotation'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-primary-foreground/65">{k}</p>
                <p className="num mt-0.5 text-base font-semibold sm:text-lg">{v}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:gap-6 sm:px-8">
          <div className="flex-1">
            <div className="mb-2 flex justify-between text-xs font-medium text-muted-foreground">
              <span data-testid="text-current-month">{s.complete ? 'All payouts collected' : `Currently month ${s.current?.month} of ${circle.months}`}</span>
              <span className="num">{Math.round(s.progress * 100)}%</span>
            </div>
            <ProgressBar value={s.progress} />
          </div>
          <p className="text-sm text-muted-foreground">
            Next due: <span className="font-semibold text-foreground">{s.nextUnpaid ? fmtDate(s.nextUnpaid.date) : 'Nothing due'}</span>
          </p>
        </div>
      </section>

      <div className="rise rounded-2xl border bg-card px-5 py-4"><AutoDebitToggle circle={circle} onToggle={api.toggleAutoDebit} /></div>

      <section className="rise" style={{ animationDelay: '80ms' }}>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Rotation ledger</h2>
            <p className="text-sm text-muted-foreground">Paid means this month's contributions are in. Collected means the recipient received the full goal.</p>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Month</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Recipient</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {circle.schedule.map((e) => {
                const current = s.current?.month === e.month;
                return (
                  <tr key={e.month} data-testid={`row-month-${e.month}`} className={cn('border-t transition-colors', current && 'bg-accent/50')}>
                    <td className="px-5 py-3.5">
                      <span className="num font-semibold">M{e.month}</span>
                      {current && <span className="ml-2 rounded bg-tertiary px-1.5 py-0.5 text-[10px] font-bold uppercase text-tertiary-foreground">Now</span>}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{fmtDate(e.date)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Initials name={e.recipient} size="sm" highlight={e.recipient === 'Ahmed'} />
                        <span className="font-medium">{displayMember(e.recipient)}{e.recipient === 'Ahmed' && <span className="text-muted-foreground"> (you)</span>}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={displayStatus(e)} testId={`status-month-${e.month}`} />{e.funding?.queuedAt && <p className="num mt-1 text-[11px] text-muted-foreground">{e.collected ? 'Released' : 'Queued'} {fmtStamp(e.funding.releasedAt ?? e.funding.queuedAt)}</p>}</td>
                    <td className="px-5 py-3.5"><div className="flex justify-end">{actions(e)}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <ol className="space-y-2.5 md:hidden">
          {circle.schedule.map((e) => {
            const current = s.current?.month === e.month;
            return (
              <li key={e.month} data-testid={`card-month-${e.month}`} className={cn('rounded-2xl border bg-card p-4', current && 'border-primary/50 ring-1 ring-primary/20')}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <Initials name={e.recipient} highlight={e.recipient === 'Ahmed'} />
                    <div>
                      <p className="font-semibold">{displayMember(e.recipient)}{e.recipient === 'Ahmed' && <span className="font-normal text-muted-foreground"> (you)</span>}</p>
                      <p className="text-xs text-muted-foreground"><span className="num">Month {e.month}</span> · {fmtDate(e.date)}</p>
                      {e.funding?.queuedAt && <p className="num text-[11px] text-muted-foreground">{e.collected ? 'Released' : 'Queued'} {fmtStamp(e.funding.releasedAt ?? e.funding.queuedAt)}</p>}
                    </div>
                  </div>
                  <StatusBadge status={displayStatus(e)} />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <span className="num text-xs text-muted-foreground">{current ? 'Current month' : `Goal ${fmtKWD(goal)}`}</span>
                  {actions(e)}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <FundingHistoryPanel circle={circle} api={api} />

      <div className="flex flex-col items-end gap-1">
        {hasHeldFunds(circle) && <p className="max-w-sm text-right text-xs text-muted-foreground" data-testid="text-delete-blocked">Deletion is locked while the vault holds participant funds. Release held funds first by completing the demo transfer.</p>}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" disabled={hasHeldFunds(circle)} className="text-destructive hover:text-destructive" data-testid="button-delete-circle"><Trash2 className="mr-1.5 h-4 w-4" /> Delete circle</Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {circle.name}?</AlertDialogTitle>
              <AlertDialogDescription>This removes the circle and its ledger from this demo. You can restore the sample circles anytime with Reset demo.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Keep it</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { api.removeCircle(circle.id); onBack(); }} data-testid="button-confirm-delete">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
