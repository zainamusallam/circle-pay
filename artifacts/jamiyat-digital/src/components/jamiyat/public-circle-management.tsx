import { format, parseISO } from 'date-fns';
import { CalendarDays, Check, Clock3, UsersRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { displayMember, fmtDate, fmtKWD } from '@/lib/circles';
import type { PublicCircle } from '@/lib/public-circles';

export function PublicCircleManagement({ circles, onApprove, onDecline }: {
  circles: PublicCircle[];
  onApprove: (circle: PublicCircle, requestId: string) => void;
  onDecline: (circle: PublicCircle, requestId: string) => void;
}) {
  if (circles.length === 0) return null;

  return (
    <section className="space-y-3" aria-label="Your public circles">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Your public circles</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Approve requests to fill open places. A circle joins your active list when it is full.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {circles.map((circle, index) => (
          <article key={circle.id} className="rise overflow-hidden rounded-2xl border bg-card" style={{ animationDelay: `${index * 50}ms` }} data-testid={`public-circle-${circle.id}`}>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-bold">{circle.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Public listing · names hidden from search</p>
                </div>
                <span className="shrink-0 rounded-full bg-tertiary/10 px-2.5 py-1 text-xs font-semibold text-tertiary">
                  {circle.capacity - circle.members.length} {circle.capacity - circle.members.length === 1 ? 'place' : 'places'} open
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/60 p-3 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Goal</p>
                  <p className="num mt-1 text-sm font-bold">{fmtKWD(circle.goal)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Starts</p>
                  <p className="mt-1 text-sm font-bold">{fmtDate(circle.startDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Members</p>
                  <p className="mt-1 text-sm font-bold">{circle.members.length}/{circle.capacity}</p>
                </div>
              </div>

              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <UsersRound className="h-3.5 w-3.5" aria-hidden />
                {circle.members.map(displayMember).join(', ')}
              </p>
            </div>

            <div className="border-t bg-muted/20 px-5 py-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-sm font-bold">Join requests</h4>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden /> {circle.requests.length} pending
                </span>
              </div>
              {circle.requests.length === 0 ? (
                <p className="rounded-xl border border-dashed bg-card px-3 py-4 text-center text-xs text-muted-foreground">No requests yet. This listing appears in numbered open-circle search.</p>
              ) : (
                <ul className="space-y-2">
                  {circle.requests.map((request) => (
                    <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3" data-testid={`join-request-${request.id}`}>
                      <div>
                        <p className="text-sm font-semibold">{request.requester}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3" aria-hidden />
                          {format(parseISO(request.createdAt), 'd MMM yyyy, HH:mm')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={() => onApprove(circle, request.id)} className="h-11 rounded-lg bg-tertiary text-tertiary-foreground hover:bg-tertiary/90 md:h-9" data-testid={`button-approve-request-${request.id}`}>
                          <Check className="mr-1 h-3.5 w-3.5" aria-hidden /> Approve
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => onDecline(circle, request.id)} className="h-11 rounded-lg md:h-9" data-testid={`button-decline-request-${request.id}`}>
                          <X className="mr-1 h-3.5 w-3.5" aria-hidden /> Decline
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
