import { ArrowUpRight, CalendarClock, CircleDollarSign, Layers, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { circleStats, fmtDate, fmtKWD, type Circle } from '@/lib/circles';
import { Initials, ProgressBar } from './bits';
import { AutoDebitToggle, VaultMeter } from './funding-ui';

type Toggle = (id: string, enabled: boolean) => void;

export function CircleCard({ circle, onOpen, index, onToggleAuto }: { circle: Circle; onOpen: () => void; index: number; onToggleAuto: Toggle }) {
  const s = circleStats(circle);
  return (
    <div style={{ animationDelay: `${index * 60}ms` }} className="rise flex flex-col overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_hsl(160_30%_20%/0.05)] transition-all duration-200 hover:border-primary/40 hover:shadow-[0_10px_30px_-12px_hsl(160_50%_20%/0.25)]">
    <button
      type="button"
      onClick={onOpen}
      data-testid={`card-circle-${circle.id}`}
      className="group w-full flex-1 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold tracking-tight" data-testid={`text-circle-name-${circle.id}`}>{circle.name}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span className="num font-semibold text-foreground">{fmtKWD(circle.amount)}</span> / month
          </p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{s.complete ? 'Rotation complete' : `Month ${s.current?.month} of ${circle.months}`}</span>
        <span className="num">{s.collectedCount}/{circle.months} paid out</span>
      </div>
      <ProgressBar value={s.progress} className="mt-2" />

      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="flex -space-x-2">
          {circle.members.slice(0, 6).map((m, i) => (
            <span key={i} className="rounded-full ring-2 ring-card"><Initials name={m} size="sm" highlight={m === 'Ahmed'} /></span>
          ))}
          {circle.members.length > 6 && <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold ring-2 ring-card">+{circle.members.length - 6}</span>}
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Next due</p>
          <p className="text-sm font-semibold" data-testid={`text-next-due-${circle.id}`}>
            {s.nextUnpaid ? fmtDate(s.nextUnpaid.date) : s.current ? 'Awaiting payout' : 'All settled'}
          </p>
        </div>
      </div>
      <div className="mt-4"><VaultMeter circle={circle} compact /></div>
    </button>
    <div className="border-t bg-muted/30 px-5 py-3"><AutoDebitToggle circle={circle} onToggle={onToggleAuto} /></div>
    </div>
  );
}

export function Dashboard({ circles, onOpen, onNew, onSeeAll, onToggleAuto }: { circles: Circle[]; onOpen: (id: string) => void; onNew: () => void; onSeeAll: () => void; onToggleAuto: Toggle }) {
  const active = circles.filter((c) => !circleStats(c).complete);
  const totalContributed = circles.reduce((sum, c) => sum + circleStats(c).contributed, 0);
  const next = circles
    .map((c) => ({ c, e: circleStats(c).current }))
    .filter((x) => x.e)
    .sort((a, b) => a.e!.date.localeCompare(b.e!.date))[0];
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const metrics = [
    { label: 'Active Circles', value: String(active.length), hint: `${circles.length} total`, Icon: Layers, id: 'active-circles' },
    { label: 'Total Contributed', value: fmtKWD(totalContributed), hint: 'across all circles', Icon: CircleDollarSign, id: 'total-contributed' },
    {
      label: 'Next Payout Due',
      value: next ? fmtDate(next.e!.date) : 'None scheduled',
      hint: next ? `${fmtKWD(next.c.amount * next.c.months)} to ${next.e!.recipient}` : 'Start a circle to begin',
      Icon: CalendarClock,
      id: 'next-payout',
    },
  ];

  return (
    <div className="space-y-8">
      <header className="rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">{part}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl" data-testid="text-greeting">Welcome back, Ahmed</h1>
          <p className="mt-2 max-w-md text-muted-foreground">Here is where every circle stands today. Who has paid, who collects next.</p>
        </div>
        <Button onClick={onNew} size="lg" className="rounded-xl" data-testid="button-new-circle-hero">
          <Plus className="mr-1.5 h-4 w-4" /> New circle
        </Button>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.3fr_1.3fr]">
        {metrics.map((m, i) => (
          <div
            key={m.id}
            style={{ animationDelay: `${80 + i * 60}ms` }}
            className={`rise rounded-2xl border p-5 ${i === 2 ? 'border-transparent bg-primary text-primary-foreground' : 'bg-card'}`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-sm font-medium ${i === 2 ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>{m.label}</p>
              <m.Icon className={`h-4 w-4 ${i === 2 ? 'text-primary-foreground/70' : 'text-primary'}`} />
            </div>
            <p className="num mt-3 text-2xl font-semibold sm:text-[28px]" data-testid={`text-metric-${m.id}`}>{m.value}</p>
            <p className={`mt-1 text-xs ${i === 2 ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{m.hint}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">My Active Circles</h2>
          {circles.length > 0 && (
            <button onClick={onSeeAll} className="text-sm font-semibold text-primary hover:underline" data-testid="link-see-all">See all circles</button>
          )}
        </div>
        {active.length === 0 ? (
          <EmptyCircles onNew={onNew} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {active.map((c, i) => <CircleCard key={c.id} circle={c} index={i} onOpen={() => onOpen(c.id)} onToggleAuto={onToggleAuto} />)}
          </div>
        )}
      </section>
    </div>
  );
}

export function EmptyCircles({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary"><Layers className="h-5 w-5" /></div>
      <h3 className="mt-4 font-bold">No active circles</h3>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">Gather family or colleagues, agree on an amount, and let the rotation do the rest.</p>
      <Button onClick={onNew} className="mt-5 rounded-xl" data-testid="button-new-circle-empty"><Plus className="mr-1.5 h-4 w-4" /> Create a circle</Button>
    </div>
  );
}

export function AllCircles({ circles, onOpen, onNew, onToggleAuto }: { circles: Circle[]; onOpen: (id: string) => void; onNew: () => void; onToggleAuto: Toggle }) {
  return (
    <div className="space-y-6">
      <header className="rise flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">My Circles</h1>
          <p className="mt-1 text-muted-foreground">{circles.length} circle{circles.length === 1 ? '' : 's'}, active and completed.</p>
        </div>
        <Button onClick={onNew} className="rounded-xl" data-testid="button-new-circle-list"><Plus className="mr-1.5 h-4 w-4" /> New</Button>
      </header>
      {circles.length === 0 ? <EmptyCircles onNew={onNew} /> : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {circles.map((c, i) => <CircleCard key={c.id} circle={c} index={i} onOpen={() => onOpen(c.id)} onToggleAuto={onToggleAuto} />)}
        </div>
      )}
    </div>
  );
}
