import { useMemo, useState, type FormEvent } from 'react';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, ArrowRight, CalendarDays, Search, Target, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fmtKWD } from '@/lib/circles';
import { findSimilarCircles, getDiscoverableCircles, type DiscoverableCircle } from '@/lib/discover-circles';
import type { PublicCircle } from '@/lib/public-circles';
import type { Circle } from '@/lib/circles';

export function JoinCircles({ onBack, onRequest, onCancelRequest, onJoinInvite, requestedIds, publicCircles }: {
  onBack: () => void;
  onRequest: (circle: DiscoverableCircle, label: string) => void;
  onCancelRequest: (circle: DiscoverableCircle, label: string) => void;
  onJoinInvite: (code: string, memberName: string) => Circle | null;
  requestedIds: string[];
  publicCircles: PublicCircle[];
}) {
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [inviteCode, setInviteCode] = useState(() => new URLSearchParams(window.location.search).get('invite') ?? '');
  const [memberName, setMemberName] = useState('');
  const [inviteError, setInviteError] = useState('');
  const listings = useMemo(() => [...getDiscoverableCircles(), ...publicCircles], [publicCircles]);
  const results = findSimilarCircles(listings, {
    goal: goal.trim() ? Number(goal) : undefined,
    startDate: startDate || undefined,
  });
  const hasSearch = goal.trim().length > 0 || startDate.length > 0;
  const submitInvite = (event: FormEvent) => {
    event.preventDefault();
    const joined = onJoinInvite(inviteCode, memberName);
    if (!joined) {
      setInviteError('That code is invalid, already full, or this name is already in the circle.');
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState({}, '', url);
    setInviteError('');
  };

  return (
    <div className="space-y-7">
      <header className="rise">
        <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground" data-testid="button-back-to-dashboard">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </button>
        <p className="text-sm font-semibold text-tertiary">Find your people</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Join a circle</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">Find a demo circle with a savings goal and start date that work for you. Requests stay pending here and don’t add a circle yet.</p>
      </header>

      <form onSubmit={submitInvite} className="rounded-3xl border border-primary/15 bg-accent/40 p-5 sm:p-6" aria-label="Join by private invite">
        <div className="mb-4">
          <h2 className="font-bold">Have a private invite?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Enter the code from your circle owner. You add your own name—no member list for the creator to fill in.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Invite code</span>
            <input value={inviteCode} onChange={(event) => { setInviteCode(event.target.value.toUpperCase()); setInviteError(''); }} placeholder="CP-ABC123" autoCapitalize="characters" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="input-invite-code" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Your name</span>
            <input value={memberName} onChange={(event) => { setMemberName(event.target.value); setInviteError(''); }} placeholder="Enter your name" maxLength={40} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="input-invite-member-name" />
          </label>
          <Button type="submit" className="h-11 rounded-xl" disabled={!inviteCode.trim() || !memberName.trim()} data-testid="button-join-private-invite">
            Join private circle <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
          </Button>
        </div>
        {inviteError && <p role="alert" className="mt-2 text-sm font-medium text-destructive" data-testid="text-invite-error">{inviteError}</p>}
        <p className="mt-3 text-xs text-muted-foreground">Demo only: invite codes are saved in the creator’s browser and do not sync across devices yet.</p>
      </form>

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
            {results.map((circle, index) => {
              const number = listings.findIndex((listing) => listing.id === circle.id) + 1;
              const label = `Open Circle ${String(number).padStart(2, '0')}`;
              const requested = requestedIds.includes(circle.id);
              return (
              <article key={circle.id} style={{ animationDelay: `${index * 50}ms` }} className="rise rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md" data-testid={`discover-circle-${circle.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold tracking-tight">{label}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Demo rotation with {circle.openSpots} open {circle.openSpots === 1 ? 'place' : 'places'}.</p>
                  </div>
                  {circle.similarity !== null && (
                    <span className="shrink-0 rounded-full bg-tertiary/10 px-2.5 py-1 text-xs font-bold text-tertiary" data-testid={`text-match-${circle.id}`}>
                      {circle.similarity}% match
                    </span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-3 sm:grid-cols-3">
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
                  {requested ? (
                    <div className="flex items-center gap-2" role="status" data-testid={`status-request-${circle.id}`}>
                      <span className="rounded-full bg-tertiary/10 px-3 py-1.5 text-xs font-semibold text-tertiary">Request pending</span>
                      <Button type="button" variant="ghost" onClick={() => onCancelRequest(circle, label)} className="h-10 rounded-xl text-muted-foreground md:h-9" data-testid={`button-cancel-request-${circle.id}`}>Cancel</Button>
                    </div>
                  ) : (
                    <Button type="button" onClick={() => onRequest(circle, label)} className="h-11 rounded-xl bg-tertiary text-tertiary-foreground hover:bg-tertiary/90 md:h-10" data-testid={`button-request-${circle.id}`}>
                      Request to join <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                    </Button>
                  )}
                </div>
              </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
