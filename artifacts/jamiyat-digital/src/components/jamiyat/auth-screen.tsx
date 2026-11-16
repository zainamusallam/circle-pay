import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CirclePayMark } from '@/components/jamiyat/welcome';

export function AnonymousSessionError({ message, onRetry, onBack }: { message: string; onRetry: () => void; onBack: () => void }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
        <button type="button" onClick={onBack} className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground" data-testid="button-auth-back">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <CirclePayMark size={44} />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-tertiary">Circle Pay</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight">Couldn’t open Circle Pay</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Circle Pay starts a private demo session automatically. No email or password is needed.</p>
        <p role="alert" className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive" data-testid="text-auth-error">{message}</p>
        <Button type="button" onClick={onRetry} className="mt-4 h-12 w-full rounded-xl" data-testid="button-auth-retry">
          <RefreshCw className="mr-2 h-4 w-4" /> Try again
        </Button>
        <p className="mt-5 text-center text-xs text-muted-foreground">Demo balances and payments are simulated. No real money moves.</p>
      </section>
    </main>
  );
}

export function SupabaseSetupNotice({ onBack, missing }: { onBack: () => void; missing: string[] }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-lg rounded-3xl border bg-card p-6 shadow-xl sm:p-8">
        <button type="button" onClick={onBack} className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-2xl font-extrabold">Supabase settings are missing</h1>
        <p className="mt-2 text-sm text-muted-foreground">The current app build cannot see these settings:</p>
        <ul className="mt-3 list-inside list-disc rounded-xl bg-muted/60 px-4 py-3 text-sm font-semibold" data-testid="text-supabase-config-status">
          {missing.map((key) => <li key={key}><code>{key}</code></li>)}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">The publishable key belongs in Replit Secrets. Do not use a service-role key. After updating settings, restart the web workflow and refresh this page.</p>
        <Button type="button" variant="outline" onClick={() => window.location.reload()} className="mt-5 h-11 rounded-xl" data-testid="button-reload-supabase">Refresh app</Button>
      </section>
    </main>
  );
}
