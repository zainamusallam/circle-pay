import { useState, type FormEvent } from 'react';
import { ArrowLeft, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CirclePayMark } from '@/components/jamiyat/welcome';
import { supabase, missingSupabaseConfig } from '@/lib/supabase';

export function AuthScreen({ onBack, sessionError }: { onBack: () => void; sessionError?: string | null }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const creating = mode === 'signup';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!supabase) {
      setError(`Supabase configuration is missing: ${missingSupabaseConfig.join(', ')}.`);
      return;
    }
    setBusy(true);
    try {
      if (creating) {
        const { data, error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
        });
        if (signupError) throw signupError;
        if (!data.session) {
          setMessage('Check your email to confirm your account, then return here to sign in.');
          setMode('signin');
          setPassword('');
        }
      } else {
        const { error: signinError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signinError) throw signinError;
      }
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : 'Could not sign in. Please try again.';
      setError(/invalid api key/i.test(detail)
        ? 'The Supabase publishable key is invalid. The project owner needs to update the app configuration before sign-in can work.'
        : detail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-8" data-testid="screen-auth">
      <section className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
        <button type="button" onClick={onBack} className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground" data-testid="button-auth-back">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <CirclePayMark size={44} />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-tertiary">Circle Pay</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight">{creating ? 'Create your account' : 'Welcome back'}</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Sign in to keep your circles and demo activity saved to your account.</p>
        <div className="mt-6 grid grid-cols-2 rounded-xl bg-muted p-1" aria-label="Account access">
          {(['signin', 'signup'] as const).map((value) => (
            <button key={value} type="button" disabled={busy} aria-pressed={mode === value} onClick={() => { setMode(value); setError(null); setMessage(null); }}
              className={`min-h-11 rounded-lg text-sm font-semibold ${mode === value ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
              data-testid={value === 'signin' ? 'tab-sign-in' : 'tab-create-account'}>
              {value === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input id="auth-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} className="h-12 rounded-xl pl-10" data-testid="input-auth-email" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-password">Password</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input id="auth-password" type="password" autoComplete={creating ? 'new-password' : 'current-password'} required minLength={creating ? 8 : 1} value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} className="h-12 rounded-xl pl-10" data-testid="input-auth-password" />
            </div>
            {creating && <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>}
          </div>
          {(error || sessionError) && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive" data-testid="text-auth-error">{error || sessionError}</p>}
          {message && <p role="status" className="rounded-xl border bg-muted px-3 py-2.5 text-sm" data-testid="text-auth-message">{message}</p>}
          <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl" data-testid="button-auth-submit">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busy ? 'Please wait…' : creating ? 'Create account' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">Demo wallets and payments are simulated. No real bank connection or money movement.</p>
      </section>
    </main>
  );
}
