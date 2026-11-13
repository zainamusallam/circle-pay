import { Check, Clock, HandCoins, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MonthStatus } from '@/lib/circles';

export function StatusBadge({ status, testId }: { status: MonthStatus; testId?: string }) {
  const map = {
    Paid: { cls: 'bg-sky-50 text-sky-800 ring-sky-200', Icon: Check },
    Pending: { cls: 'bg-amber-50 text-amber-800 ring-amber-200', Icon: Clock },
    Collected: { cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200', Icon: HandCoins },
    'Auto-Paid (Escrow Secured)': { cls: 'bg-teal-50 text-teal-900 ring-teal-300', Icon: ShieldCheck },
  }[status] ?? { cls: 'bg-muted text-muted-foreground ring-border', Icon: Clock };
  return (
    <span
      key={status}
      data-testid={testId}
      className={cn('pop inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', map.cls)}
    >
      <map.Icon className="h-3 w-3" aria-hidden />
      {status}
    </span>
  );
}

export function Initials({ name, highlight, size = 'md' }: { name: string; highlight?: boolean; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-xs',
        highlight ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground ring-1 ring-border',
      )}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="h-full origin-left rounded-full bg-primary transition-transform duration-700 ease-out"
        style={{ transform: `scaleX(${Math.max(0.0001, value)})` }}
      />
    </div>
  );
}

export function DemoPill({ className }: { className?: string }) {
  return (
    <span data-testid="text-demo-indicator" className={cn('inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/40 px-2.5 py-0.5 text-[11px] font-medium text-primary', className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      Demo mode, no real money moves
    </span>
  );
}
