import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, ArrowRight, CalendarDays, Search, Target, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fmtKWD } from '@/lib/circles';
import { findSimilarCircles, getDiscoverableCircles, type DiscoverableCircle } from '@/lib/discover-circles';

export function JoinCircles({ onBack, onJoin, joinedNames }: {
  onBack: () => void;
  onJoin: (circle: DiscoverableCircle) => void;
  joinedNames: string[];
}) {
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const listings = useMemo(() => getDiscoverableCircles(), []);
  const results = findSimilarCircles(listings, {
    goal: goal.trim() ? Number(goal) : undefined,
    startDate: startDate || undefined,
  }).filter((circle) => !joinedNames.includes(circle.name));
  const hasSearch = goal.trim().length > 0 || startDate.length > 0;

  const join = (circle: DiscoverableCircle) => {
    onJoin(circle);
  };

  return (
    <div className="space-y-7">
      <header className="rise">
        <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground" data-testid="button-back-to-dashboard">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </button>
        <p className="text-sm font-semibold text-tertiary">Find your people</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Join a circle</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">Find a demo circle with a savings goal and start date that work for you.</p>
      </header>

      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6" aria-label="Search circles">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-tertiary/10 text-tertiary">
            <Search className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-bold">Find a close match</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Add either or both preferences. We’ll show circles with goals within 25% and start dates within 45 days.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Savings goal</span>
            <span className="relative block">
              <Target className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="number"
                min="1"
                step="0.001"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="Any goal"
                aria-label="Preferred savings goal in KWD"
                className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-14 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="input-join-goal"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">KWD</span>
            </span>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Preferred start date</span>
            <span className="relative block">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                aria-label="Preferred circle start date"
                className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="input-join-start-date"
              />
            </span>
          </label>
          <Button type="button" onClick={() => { setGoal(''); setStartDate(''); }} variant="outline" className="h-11 rounded-xl" disabled={!hasSearch} data-testid="button-clear-circle-search">
            Clear filters
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground" aria-live="polite" data-testid="text-circle-search-count">
          {results.length} matching circle{results.length === 1 ? '' : 's'} {hasSearch ? 'for your preferences' : 'with open places'}
        </p>
      </section>

      {results.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-card/70 px-6 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Search className="h-5 w-5" aria-hidden />
          </span>
          <h2 className="mt-4 font-bold">No close matches yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Try a different goal or start date to see more demo circles.</p>
          <Button type="button" onClick={() => { setGoal(''); setStartDate(''); }} variant="outline" className="mt-5 rounded-xl">Show all circles</Button>
        </div>
      ) : (
        <section aria-label="Matching circles">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-bold tracking-tight">Open circles</h2>
            <span className="text-xs text-muted-foreground">Demo listings · no real participants</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {results.map((circle, index) => (
              <article key={circle.id} style={{ animationDelay: `${index * 50}ms` }} className="rise rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md" data-testid={`discover-circle-${circle.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold tracking-tight">{circle.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{circle.description}</p>
                  </div>
                  {circle.similarity !== null && (
                    <span className="shrink-0 rounded-full bg-tertiary/10 px-2.5 py-1 text-xs font-bold text-tertiary" data-testid={`text-match-${circle.id}`}>
                      {circle.similarity}% match
                    </span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Goal</p>
                    <p className="num mt-1 text-sm font-bold">{fmtKWD(circle.goal)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Starts</p>
                    <p className="mt-1 text-sm font-bold">{format(parseISO(circle.startDate), 'd MMM yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Places</p>
                    <p className="mt-1 text-sm font-bold">{circle.openSpots} left</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <UsersRound className="h-4 w-4" aria-hidden /> {circle.members.length} of {circle.capacity} members
                  </span>
                  <Button type="button" onClick={() => join(circle)} className="h-10 rounded-xl bg-tertiary text-tertiary-foreground hover:bg-tertiary/90" data-testid={`button-join-${circle.id}`}>
                    Join circle <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
