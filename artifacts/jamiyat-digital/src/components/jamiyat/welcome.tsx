import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Circle Pay mark: an orbit ring with one gold "turn" dot travelling around it. */
export function CirclePayMark({ size = 36, spin = false, className }: { size?: number; spin?: boolean; className?: string }) {
  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center rounded-[28%] bg-tertiary', className)} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 40 40" className={cn('h-[78%] w-[78%]', spin && 'cp-spin')}>
        <circle cx="20" cy="20" r="11" fill="none" stroke="hsl(var(--tertiary-foreground))" strokeWidth="4" strokeDasharray="52 17" strokeLinecap="round" />
        <circle cx="29.5" cy="11" r="3.2" fill="#fcd34d" />
      </svg>
    </span>
  );
}

export function Welcome({ onEnter }: { onEnter: () => void }) {
  return (
    <main className="cp-welcome relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-background px-6 py-16 text-foreground" data-testid="screen-welcome">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full border-[48px] border-tertiary/[0.08]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-primary/10" />

      <div className="relative flex flex-col items-center text-center">
        <div className="rise rounded-[2.2rem] bg-tertiary/10 p-4 ring-1 ring-tertiary/15">
          <CirclePayMark size={112} spin className="shadow-[0_20px_50px_-20px_hsl(var(--tertiary)/0.5)]" />
        </div>
        <p className="rise mt-8 text-xs font-bold uppercase tracking-[0.3em] text-tertiary" style={{ animationDelay: '80ms' }}>Savings circles in KWD</p>
        <h1 className="rise mt-3 text-5xl font-extrabold tracking-tight sm:text-7xl" style={{ animationDelay: '140ms' }} data-testid="text-welcome-title">Circle Pay</h1>
        <p className="rise mt-4 max-w-md text-base text-muted-foreground sm:text-lg" style={{ animationDelay: '200ms' }}>
          Pool with friends and colleagues. One goal, an even share each month, and everyone gets their turn.
        </p>
        <button
          type="button"
          onClick={onEnter}
          className="rise group mt-10 inline-flex h-14 items-center gap-2.5 rounded-2xl bg-primary px-8 text-base font-bold text-primary-foreground shadow-lg shadow-primary/15 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-tertiary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          style={{ animationDelay: '260ms' }}
          data-testid="button-enter-app"
        >
          Enter Circle Pay <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
        </button>
        <p className="rise mt-6 text-xs text-muted-foreground" style={{ animationDelay: '320ms' }}>No login needed. Demo data stays in this browser; balances are simulated.</p>
      </div>
    </main>
  );
}
