import { useState, type FormEvent } from 'react';
import { addMonths, format, startOfMonth } from 'date-fns';
import { AlertCircle, CheckCircle2, Wand2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fmtKWD, parsePrompt, type ParseResult } from '@/lib/circles';

type Visibility = 'private' | 'public';
type Values = { name: string; goal: string; months: string; startDate: string; visibility: Visibility };
type Errors = Partial<Record<keyof Values, string>>;

const EXAMPLE = 'Create a 5-month circle for 40 dinars each starting next month';
const INVITE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const createInviteCode = () => {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `CP-${Array.from(bytes, (byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length]).join('')}`;
};
const blank = (): Values => ({
  name: '',
  goal: '',
  months: '6',
  startDate: format(addMonths(startOfMonth(new Date()), 1), 'yyyy-MM-dd'),
  visibility: 'private',
});

export function NewCircleDialog({ open, onOpenChange, onCreate }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (v: { name: string; goal: number; months: number; startDate: string; visibility: Visibility; inviteCode?: string }) => void | Promise<void>;
}) {
  const [values, setValues] = useState<Values>(blank);
  const [errors, setErrors] = useState<Errors>({});
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const reset = () => { setValues(blank()); setErrors({}); setPrompt(''); setResult(null); setSubmitError(''); };
  const set = (k: keyof Values, v: string) => {
    setValues((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({
      ...e,
      [k]: undefined,
    }));
  };

  const runAssistant = () => {
    if (!prompt.trim()) { setResult({ ok: false, fields: {}, understood: [], missing: ['a description of your circle'] }); return; }
    const r = parsePrompt(prompt);
    setResult(r);
    if (r.understood.length) {
      setValues((p) => {
        const months = r.fields.months != null ? String(r.fields.months) : p.months;
        const m = Number(months);
        // Assistant reads a MONTHLY amount per member; goal = monthly x participants.
        const goal = r.fields.amount != null && Number.isInteger(m) && m >= 2 && m <= 24
          ? String(Math.round(r.fields.amount * m * 1000) / 1000)
          : p.goal;
        return { ...p, name: r.fields.name ?? p.name, goal, months, startDate: r.fields.startDate ?? p.startDate };
      });
      setErrors({});
    }
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e: Errors = {};
    const goal = Number(values.goal);
    const months = Number(values.months);
    if (values.name.trim().length < 2) e.name = 'Give the circle a name (at least 2 characters).';
    else if (values.name.trim().length > 50) e.name = 'Keep the name under 50 characters.';
    const monthsOk = /^\d+$/.test(values.months.trim()) && Number.isInteger(months) && months >= 2 && months <= 24;
    if (!monthsOk) e.months = 'Choose a whole number between 2 and 24.';
    if (!values.goal || !Number.isFinite(goal) || goal <= 0) e.goal = 'Enter a savings goal greater than 0 KWD.';
    else if (!/^\d+(\.\d{1,3})?$/.test(values.goal.trim())) e.goal = 'Use up to 3 decimals (fils).';
    else if (goal > 1000000) e.goal = 'Maximum goal is 1,000,000 KWD.';
    else if (monthsOk && Math.round(goal * 1000) < months) e.goal = `Goal must give each of ${months} members at least 1 fils.`;
    if (!values.startDate || Number.isNaN(Date.parse(values.startDate))) e.startDate = 'Pick a valid start date.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const inviteCode = values.visibility === 'private' ? createInviteCode() : undefined;
    setSaving(true);
    setSubmitError('');
    try {
      await onCreate({ name: values.name.trim(), goal, months, startDate: values.startDate, visibility: values.visibility, inviteCode });
      reset();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not create the circle. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const field = (k: keyof Values, label: string, props: Record<string, unknown>, suffix?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`f-${k}`} className="text-sm font-semibold">{label}</Label>
      <div className="relative">
        <Input
          id={`f-${k}`}
          value={values[k]}
          onChange={(ev) => set(k, ev.target.value)}
          aria-invalid={!!errors[k]}
          aria-describedby={errors[k] ? `e-${k}` : undefined}
          className={`h-11 rounded-xl ${suffix ? 'pr-14' : ''} ${errors[k] ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          data-testid={`input-${k}`}
          {...props}
        />
        {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">{suffix}</span>}
      </div>
      {errors[k] && <p id={`e-${k}`} className="text-xs font-medium text-destructive" data-testid={`error-${k}`}>{errors[k]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-xl gap-0 overflow-y-auto rounded-3xl bg-card p-0">
        <DialogHeader className="px-6 pb-4 pt-6 text-left">
          <DialogTitle className="text-xl font-extrabold tracking-tight">Start a new circle</DialogTitle>
          <DialogDescription>Set a savings goal and member count. Circle Pay splits it into an equal monthly share. The assistant reads a monthly amount per member and converts it into the goal.</DialogDescription>
        </DialogHeader>

        <div className="mx-6 rounded-2xl border border-primary/20 bg-accent/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="assistant" className="flex items-center gap-1.5 text-sm font-bold text-primary">
              <Wand2 className="h-4 w-4" /> Smart Assistant
            </Label>
            <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ring-1 ring-border">Demo · rule-based, not AI</span>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              id="assistant"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runAssistant(); } }}
              placeholder={EXAMPLE}
              className="h-11 rounded-xl bg-card"
              data-testid="input-assistant"
            />
            <Button type="button" onClick={runAssistant} className="h-11 rounded-xl" data-testid="button-assistant-fill">Fill form</Button>
          </div>
          {!result && (
            <button type="button" onClick={() => setPrompt(EXAMPLE)} className="mt-2 text-left text-xs text-muted-foreground hover:text-primary" data-testid="button-assistant-example">
              Try: <span className="underline underline-offset-2">{EXAMPLE}</span>
            </button>
          )}
          {result && (
            <div aria-live="polite" className="pop mt-3 text-xs" data-testid="text-assistant-result">
              {result.understood.length === 0 ? (
                <p className="flex gap-1.5 text-amber-800">
                  <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                  <span>Could not read that. Include an amount, a length and a start, for example "6 months, 50 KD each, starting 1 March, called Diwaniya Circle". Nothing was filled.</span>
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="flex gap-1.5 text-primary">
                    <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" />
                    <span>Filled: {result.understood.join(', ')}. {result.fields.amount != null ? `${result.fields.amount} KWD each per month was converted to a savings goal of ${result.fields.amount} x ${values.months} participants = ${values.goal} KWD.` : ''} Review below before creating.</span>
                  </p>
                  {result.missing.length > 0 && (
                    <p className="flex gap-1.5 text-amber-800"><AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" /><span>Not found, please set manually: {result.missing.join('; ')}.</span></p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={submit} noValidate className="space-y-4 px-6 pb-6 pt-5">
          {field('name', 'Circle Name', { placeholder: 'e.g. Diwaniya Circle', maxLength: 60 })}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field('goal', 'Savings Goal', { inputMode: 'decimal', placeholder: '3000' }, 'KWD')}
            {field('months', 'Members / Months', { type: 'number', min: 2, max: 24, inputMode: 'numeric' })}
          </div>
          {field('startDate', 'Start Date', { type: 'date' })}
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Who can join?</legend>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Circle visibility">
              {([
                ['private', 'Private circle', 'Share an invite code or link.'],
                ['public', 'Public circle', 'Let people request open places.'],
              ] as const).map(([value, title, hint]) => (
                <label key={value} className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors ${values.visibility === value ? 'border-tertiary/50 bg-tertiary/5' : 'border-border hover:bg-muted/60'}`}>
                  <input
                    type="radio"
                    name="circle-visibility"
                    value={value}
                    checked={values.visibility === value}
                    onChange={() => set('visibility', value)}
                    className="mt-1 accent-[hsl(var(--tertiary))]"
                    data-testid={`radio-visibility-${value}`}
                  />
                  <span>
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="rounded-xl border border-tertiary/20 bg-tertiary/5 px-3.5 py-3 text-sm text-muted-foreground" data-testid="text-member-invite-help">
            {values.visibility === 'private' ? (
              <>
                <p className="font-semibold text-foreground">No need to enter member names</p>
                <p className="mt-1">Circle Pay will create {Math.max(0, (Number(values.months) || 1) - 1)} invite spot{Number(values.months) === 2 ? '' : 's'}. Share the code or link after creating the circle; each person adds their own name when they join.</p>
                <p className="mt-1 text-xs">This demo stores circles in this browser. Joining from another device requires the Supabase setup, which is currently paused.</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-foreground">Public circle requests</p>
                <p className="mt-1">People can request open places. You approve each request, and the rotation begins after all places are filled.</p>
              </>
            )}
          </div>
          {(() => {
            const g = Number(values.goal); const n = Number(values.months);
            const ok = g > 0 && Number.isFinite(g) && Number.isInteger(n) && n >= 2 && n <= 24 && Math.round(g * 1000) >= n;
            const fils = ok ? Math.round(g * 1000) : 0;
            const base = ok ? Math.floor(fils / n) / 1000 : 0;
            const extra = ok ? fils % n : 0;
            return (
              <div className="space-y-1.5">
                <Label htmlFor="f-share" className="text-sm font-semibold">Monthly share per participant</Label>
                <div id="f-share" role="status" aria-live="polite" className="rounded-xl border border-primary/20 bg-accent/50 px-4 py-3" data-testid="text-derived-share">
                  {ok ? (
                    <>
                      <p className="num text-lg font-semibold text-primary">{fmtKWD(base + (extra ? 0.001 : 0))}{extra ? <span className="text-sm font-medium text-muted-foreground"> max</span> : null}</p>
                      <p className="num text-xs text-muted-foreground">{fmtKWD(g)} / {n} participants, each billing cycle. One member collects the full goal each month.</p>
                      {extra > 0 && <p className="text-xs text-muted-foreground">Rounded to fils: {extra} member{extra === 1 ? '' : 's'} pay {fmtKWD(base + 0.001)}, the rest {fmtKWD(base)}.</p>}
                    </>
                  ) : <p className="text-sm text-muted-foreground">Read-only. Enter a goal and member count to see each share.</p>}
                </div>
              </div>
            );
          })()}
          {submitError && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive" data-testid="text-create-circle-error">{submitError}</p>}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => { onOpenChange(false); reset(); }} data-testid="button-cancel-create">Cancel</Button>
            <Button type="submit" disabled={saving} className="h-11 rounded-xl px-6" data-testid="button-create-circle">{saving ? 'Saving…' : 'Create circle'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
