import { useState } from 'react';
import { CreditCard, LayoutGrid, Layers, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCircles } from '@/hooks/use-circles';
import { fmtKWD } from '@/lib/circles';
import { cn } from '@/lib/utils';
import { AllCircles, Dashboard } from '@/components/jamiyat/dashboard';
import { CircleDetail } from '@/components/jamiyat/circle-detail';
import { NewCircleDialog } from '@/components/jamiyat/new-circle-dialog';
import { DemoPill } from '@/components/jamiyat/bits';
import { DemoControlBar, LinkedAccounts } from '@/components/jamiyat/funding-ui';

type View = { kind: 'dashboard' } | { kind: 'circles' } | { kind: 'accounts' } | { kind: 'circle'; id: string };

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
        <span className="h-4 w-4 rounded-full border-[3px] border-primary-foreground" />
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-300" />
      </span>
      <div className="leading-tight">
        <p className="text-[15px] font-extrabold tracking-tight">Jamiyat</p>
        <p className="text-[11px] font-medium text-muted-foreground">Digital</p>
      </div>
    </div>
  );
}

export default function Home() {
  const api = useCircles();
  const { toast } = useToast();
  const [view, setView] = useState<View>({ kind: 'dashboard' });
  const [open, setOpen] = useState(false);

  const go = (v: View) => { setView(v); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const circle = view.kind === 'circle' ? api.circles.find((c) => c.id === view.id) : undefined;
  const tab = view.kind === 'circle' ? 'circles' : view.kind;

  const nav = [
    { id: 'dashboard' as const, label: 'Dashboard', Icon: LayoutGrid },
    { id: 'circles' as const, label: 'My Circles', Icon: Layers },
    { id: 'accounts' as const, label: 'Joint Account', Icon: CreditCard },
  ];
  const toggleAuto = (id: string, enabled: boolean) => {
    api.toggleAutoDebit(id, enabled);
    toast({ title: enabled ? 'Auto-debit resumed' : 'Auto-debit paused', description: enabled ? 'This circle joins the next simulated billing run.' : 'The simulator will skip this circle.' });
  };

  const resetDemo = () => { api.reset(); go({ kind: 'dashboard' }); toast({ title: 'Demo reset', description: 'Sample circles, mock wallets and history restored.' }); };

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-sidebar px-5 py-6 lg:flex">
        <Logo />
        <nav className="mt-10 space-y-1" aria-label="Main">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => go({ kind: n.id })}
              aria-current={tab === n.id ? 'page' : undefined}
              data-testid={`nav-${n.id}`}
              className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                tab === n.id ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
            >
              <n.Icon className="h-4 w-4" /> {n.label}
            </button>
          ))}
        </nav>
        <Button onClick={() => setOpen(true)} className="mt-6 rounded-xl" data-testid="button-new-circle-sidebar"><Plus className="mr-1.5 h-4 w-4" /> New circle</Button>

        <div className="mt-auto space-y-4 pb-28">
          <div className="rounded-2xl bg-muted p-4">
            <p className="text-xs font-semibold text-muted-foreground">Signed in as</p>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">US</span>
              <div>
                <p className="text-sm font-bold">User</p>
                <button onClick={() => go({ kind: 'accounts' })} className="text-xs font-semibold text-primary hover:underline" data-testid="link-profile-accounts">NBK **4892 (mock)</button>
                <p className="text-xs text-muted-foreground">Kuwait City</p>
              </div>
            </div>
          </div>
          <DemoPill />
          <button onClick={resetDemo} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground" data-testid="button-reset-demo">
            <RotateCcw className="h-3 w-3" /> Reset demo data
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <button onClick={resetDemo} aria-label="Reset demo data" className="rounded-lg p-2 text-muted-foreground hover:bg-muted" data-testid="button-reset-demo-mobile"><RotateCcw className="h-4 w-4" /></button>
          <Button size="sm" onClick={() => setOpen(true)} className="rounded-xl" data-testid="button-new-circle-mobile"><Plus className="mr-1 h-4 w-4" /> New</Button>
        </div>
      </header>

      <main className="px-4 pb-64 pt-6 sm:px-6 sm:pb-52 lg:ml-64 lg:px-10 lg:pb-36 lg:pt-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 lg:hidden"><DemoPill /></div>
          {api.storageError && (
            <div role="alert" className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="text-storage-error">
              Browser storage is unavailable. Demo changes work for now but cannot persist after reload.
            </div>
          )}
          {view.kind === 'dashboard' && (
            <Dashboard circles={api.circles} onOpen={(id) => go({ kind: 'circle', id })} onNew={() => setOpen(true)} onSeeAll={() => go({ kind: 'circles' })} onToggleAuto={toggleAuto} />
          )}
          {view.kind === 'circles' && (
            <AllCircles circles={api.circles} onOpen={(id) => go({ kind: 'circle', id })} onNew={() => setOpen(true)} onToggleAuto={toggleAuto} />
          )}
          {view.kind === 'accounts' && (
            <LinkedAccounts api={api} />
          )}
          {view.kind === 'circle' && circle && (
            <CircleDetail key={circle.id} circle={circle} api={api} onBack={() => go({ kind: 'dashboard' })} />
          )}
          {view.kind === 'circle' && !circle && (
            <div className="rounded-2xl border bg-card p-10 text-center">
              <p className="font-bold">This circle no longer exists.</p>
              <Button className="mt-4 rounded-xl" onClick={() => go({ kind: 'dashboard' })}>Back to dashboard</Button>
            </div>
          )}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur lg:hidden">
        {nav.map((n) => (
          <button key={n.id} onClick={() => go({ kind: n.id })} aria-current={tab === n.id ? 'page' : undefined} data-testid={`nav-mobile-${n.id}`}
            className={cn('flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold', tab === n.id ? 'text-primary' : 'text-muted-foreground')}>
            <n.Icon className="h-5 w-5" /> {n.id === 'accounts' ? 'Accounts' : n.label}
          </button>
        ))}
        <button onClick={() => setOpen(true)} data-testid="nav-mobile-new" className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold text-muted-foreground">
          <Plus className="h-5 w-5" /> New circle
        </button>
      </nav>

      <DemoControlBar api={api} />

      <NewCircleDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={(v) => {
          const c = api.addCircle(v);
          setOpen(false);
          toast({ title: `${c.name} created`, description: `${c.months}-month rotation at ${fmtKWD(c.amount)} per month.` });
          go({ kind: 'circle', id: c.id });
        }}
      />
    </div>
  );
}
