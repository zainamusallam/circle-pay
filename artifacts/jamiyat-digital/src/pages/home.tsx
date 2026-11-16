import { useState } from 'react';
import { CheckCircle2, Cloud, CreditCard, LayoutGrid, Layers, LogOut, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCircles } from '@/hooks/use-circles';
import { usePublicCircles } from '@/hooks/use-public-circles';
import { circleGoal, fmtKWD } from '@/lib/circles';
import { cn } from '@/lib/utils';
import { AllCircles, Dashboard } from '@/components/jamiyat/dashboard';
import { CircleDetail } from '@/components/jamiyat/circle-detail';
import { NewCircleDialog } from '@/components/jamiyat/new-circle-dialog';
import { CirclePayMark, Welcome } from '@/components/jamiyat/welcome';
import { DemoPill } from '@/components/jamiyat/bits';
import { LinkedAccounts } from '@/components/jamiyat/funding-ui';
import { JoinCircles } from '@/components/jamiyat/join-circles';
import type { DiscoverableCircle } from '@/lib/discover-circles';
import { useJoinRequests } from '@/hooks/use-join-requests';
import type { PublicCircle } from '@/lib/public-circles';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { AuthScreen, SupabaseSetupNotice } from '@/components/jamiyat/auth-screen';

type View = { kind: 'dashboard' } | { kind: 'circles' } | { kind: 'accounts' } | { kind: 'join' } | { kind: 'circle'; id: string };

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Circle Pay, back to welcome screen" className="flex min-h-11 items-center gap-2.5 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="link-brand-home">
      <CirclePayMark size={36} />
      <div className="leading-tight">
        <p className="text-[15px] font-extrabold tracking-tight">Circle Pay</p>
        <p className="text-[11px] font-medium text-muted-foreground">Savings circles</p>
      </div>
    </button>
  );
}

export default function Home() {
  const auth = useSupabaseAuth();
  const userId = auth.user?.id ?? null;
  const api = useCircles(userId);
  const joinRequests = useJoinRequests(userId);
  const publicCircles = usePublicCircles(userId);
  const { toast } = useToast();
  const [view, setView] = useState<View>({ kind: 'dashboard' });
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [inviteOnEntry] = useState(() => new URLSearchParams(window.location.search).has('invite'));

  const go = (v: View) => { setView(v); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const circle = view.kind === 'circle' ? api.circles.find((c) => c.id === view.id) : undefined;
  const tab = view.kind === 'circle' ? 'circles' : view.kind;

  const nav = [
    { id: 'dashboard' as const, label: 'Dashboard', Icon: LayoutGrid },
    { id: 'circles' as const, label: 'My Circles', Icon: Layers },
    { id: 'accounts' as const, label: 'Joint Accounts', Icon: CreditCard },
  ];
  const toggleAuto = (id: string, enabled: boolean) => {
    api.toggleAutoDebit(id, enabled);
    toast({ title: enabled ? 'Auto-debit resumed' : 'Auto-debit paused', description: enabled ? 'This circle joins the next simulated billing run.' : 'The simulator will skip this circle.' });
  };

  const resetDemo = () => { api.reset(); joinRequests.reset(); publicCircles.reset(); go({ kind: 'dashboard' }); toast({ title: 'Demo reset', description: 'Sample circles, mock wallets, public listings, requests and history restored.' }); };

  const requestCircle = (listing: DiscoverableCircle, label: string) => {
    if (publicCircles.circles.some((circle) => circle.id === listing.id)) {
      publicCircles.request(listing.id);
      toast({ title: 'Request sent', description: `Your request for ${label} is waiting for the circle owner’s approval.` });
      return;
    }
    joinRequests.request(listing.id);
    toast({ title: 'Request sent', description: `Your request for ${label} is pending in this demo.` });
  };
  const cancelCircleRequest = (listing: DiscoverableCircle, label: string) => {
    if (publicCircles.circles.some((circle) => circle.id === listing.id)) {
      publicCircles.cancelRequest(listing.id);
      toast({ title: 'Request cancelled', description: `Your request for ${label} was withdrawn.` });
      return;
    }
    joinRequests.cancel(listing.id);
    toast({ title: 'Request cancelled', description: `Your request for ${label} was withdrawn.` });
  };

  const approvePublicRequest = (circle: PublicCircle, requestId: string) => {
    const completed = publicCircles.approveRequest(circle.id, requestId);
    if (completed) {
      const active = api.addCircle({
        name: completed.name,
        goal: completed.goal,
        months: completed.capacity,
        startDate: completed.startDate,
        members: completed.members,
      });
      toast({ title: `${active.name} is ready`, description: 'All places are approved. The circle is now active with its full rotation.' });
      go({ kind: 'circle', id: active.id });
      return;
    }
    const remaining = Math.max(0, circle.capacity - circle.members.length - 1);
    toast({ title: 'Request approved', description: remaining ? `${remaining} more ${remaining === 1 ? 'place is' : 'places are'} needed before the rotation starts.` : 'The circle is now full.' });
  };

  const declinePublicRequest = (circle: PublicCircle, requestId: string) => {
    publicCircles.declineRequest(circle.id, requestId);
    toast({ title: 'Request declined', description: `The request for ${circle.name} was declined.` });
  };

  const toWelcome = () => { setOpen(false); setEntered(false); window.scrollTo({ top: 0 }); };
  if (!entered) return <Welcome onEnter={() => { setEntered(true); setView(inviteOnEntry ? { kind: 'join' } : { kind: 'dashboard' }); window.scrollTo({ top: 0 }); }} />;
  if (!auth.configured) return <SupabaseSetupNotice onBack={() => setEntered(false)} missing={auth.missingConfig} />;
  if (auth.loading || (userId && (api.loading || publicCircles.loading || joinRequests.loading))) {
    return <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4"><p role="status" className="rounded-2xl border bg-card px-5 py-4 text-sm font-semibold text-muted-foreground">Loading your Circle Pay account…</p></main>;
  }
  if (!auth.user) return <AuthScreen onBack={() => setEntered(false)} />;

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-sidebar px-5 py-6 lg:flex">
        <Logo onClick={toWelcome} />
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
          <button onClick={() => { void auth.signOut().catch((error) => toast({ title: 'Could not sign out', description: error instanceof Error ? error.message : 'Try again.' })); }} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground" data-testid="button-sign-out">
            <LogOut className="h-3 w-3" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
        <Logo onClick={toWelcome} />
        <div className="flex items-center gap-1">
          <button onClick={resetDemo} aria-label="Reset demo data" className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" data-testid="button-reset-demo-mobile"><RotateCcw className="h-4 w-4" /></button>
          <button onClick={() => { void auth.signOut().catch((error) => toast({ title: 'Could not sign out', description: error instanceof Error ? error.message : 'Try again.' })); }} aria-label="Sign out" className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" data-testid="button-sign-out-mobile"><LogOut className="h-4 w-4" /></button>
          <Button size="sm" onClick={() => setOpen(true)} className="h-11 rounded-xl" data-testid="button-new-circle-mobile"><Plus className="mr-1 h-4 w-4" /> New</Button>
        </div>
      </header>

      <main className="px-4 pb-28 pt-6 sm:px-6 lg:ml-64 lg:px-10 lg:pb-12 lg:pt-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 lg:hidden"><DemoPill /></div>
          {!api.storageError && !publicCircles.error && !joinRequests.error && (
            <p role="status" className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary" data-testid="status-supabase-sync">
              {api.synced && publicCircles.synced && joinRequests.synced
                ? <><CheckCircle2 className="h-3.5 w-3.5" /> Demo data saved to Supabase</>
                : <><Cloud className="h-3.5 w-3.5" /> Saving demo data to Supabase…</>}
            </p>
          )}
          {(api.storageError || publicCircles.error || joinRequests.error) && (
            <div role="alert" className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="text-storage-error">
              Some demo data could not sync to Supabase. Check your connection and try again.
            </div>
          )}
          {view.kind === 'dashboard' && (
            <Dashboard circles={api.circles} onOpen={(id) => go({ kind: 'circle', id })} onNew={() => setOpen(true)} onJoin={() => go({ kind: 'join' })} onSeeAll={() => go({ kind: 'circles' })} onToggleAuto={toggleAuto} />
          )}
          {view.kind === 'circles' && (
            <AllCircles
              circles={api.circles}
              publicCircles={publicCircles.circles}
              onOpen={(id) => go({ kind: 'circle', id })}
              onNew={() => setOpen(true)}
              onJoin={() => go({ kind: 'join' })}
              onToggleAuto={toggleAuto}
              onApproveRequest={approvePublicRequest}
              onDeclineRequest={declinePublicRequest}
            />
          )}
          {view.kind === 'join' && (
            <JoinCircles
              onBack={() => go({ kind: 'dashboard' })}
              onRequest={requestCircle}
              onCancelRequest={cancelCircleRequest}
              onJoinInvite={async (code, memberName) => {
                const joined = await api.joinByInviteCode(code, memberName);
                if (joined) {
                  toast({ title: `You joined ${joined.name}`, description: 'Your name was added to this circle.' });
                  go({ kind: 'circle', id: joined.id });
                }
                return joined;
              }}
              requestedIds={[
                ...joinRequests.requestedIds,
                ...publicCircles.circles.filter((circle) => circle.requests.length > 0).map((circle) => circle.id),
              ]}
              publicCircles={publicCircles.circles}
            />
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

      <NewCircleDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={async (v) => {
          const members = v.visibility === 'public'
            ? ['Ahmed']
            : ['Ahmed', ...Array.from({ length: v.months - 1 }, (_, index) => `Open spot ${index + 1}`)];
          if (v.visibility === 'public') {
            const listing = publicCircles.create({
              name: v.name,
              goal: v.goal,
              capacity: v.months,
              startDate: v.startDate,
              members,
            });
            setOpen(false);
            toast({
              title: 'Public circle listed',
              description: `${listing.capacity - listing.members.length} places are open. Requests need your approval before the rotation begins.`,
            });
            go({ kind: 'circles' });
            return;
          }
          const c = await api.addPrivateCircle({ ...v, members, inviteCode: v.inviteCode });
          setOpen(false);
          toast({ title: `${c.name} created`, description: `Share the invite code with ${c.months - 1} participant${c.months === 2 ? '' : 's'} so they can add their own names.` });
          go({ kind: 'circle', id: c.id });
        }}
      />
    </div>
  );
}
