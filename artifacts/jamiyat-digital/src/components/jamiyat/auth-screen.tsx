import { useState, type FormEvent } from 'react';
import { ArrowLeft, CircleCheck, LockKeyhole, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CirclePayMark } from '@/components/jamiyat/welcome';
import { supabase } from '@/lib/supabase';

export function AuthScreen({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage('Check your email to confirm your account, then return here to sign in.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not complete sign-in.');
    } finally {
      setBusy(false);
    }
  };

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
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Sign in to keep your circles and demo activity saved to your account.</p>

        <div className="mt-5 grid grid-cols-2 rounded-xl bg-muted p-1" role="tablist" aria-label="Account access">
          {(['signin', 'signup'] as const).map((item) => (
            <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => { setMode(item); setError(''); setMessage(''); }}
              className={`min-h-10 rounded-lg text-sm font-semibold transition-colors ${mode === item ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              data-testid={`tab-auth-${item}`}>
              {item === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-name">Your name</Label>
              <Input id="auth-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" maxLength={60} required className="h-11 rounded-xl" data-testid="input-auth-name" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required className="h-11 rounded-xl pl-10" data-testid="input-auth-email" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-password">Password</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input id="auth-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required className="h-11 rounded-xl pl-10" data-testid="input-auth-password" />
            </div>
            {mode === 'signup' && <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>}
          </div>
          {message && <p role="status" className="flex gap-2 rounded-xl border border-primary/15 bg-accent/40 px-3 py-2.5 text-sm text-foreground"><CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{message}</p>}
          {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive" data-testid="text-auth-error">{error}</p>}
          <Button type="submit" disabled={busy || !supabase} className="h-12 w-full rounded-xl" data-testid="button-auth-submit">
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-5 text-center text-xs text-muted-foreground">Demo wallets and contributions are simulated. No bank connection or real payments.</p>
      </section>
    </main>
  );
}

export function SupabaseSetupNotice({ onBack }: { onBack: () => void }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-lg rounded-3xl border bg-card p-6 shadow-xl sm:p-8">
        <button type="button" onClick={onBack} className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-2xl font-extrabold">Supabase setup needs one value</h1>
        <p className="mt-2 text-sm text-muted-foreground">Supabase is set up for Circle Pay, but the app also needs its publishable key in Replit Secrets as <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>. Never use a service-role or secret key in the browser.</p>
      </section>
    </main>
  );
}
