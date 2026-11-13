import { useState, type FormEvent } from 'react';
import { addMonths, format, startOfMonth } from 'date-fns';
import { AlertCircle, CheckCircle2, Wand2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parsePrompt, type ParseResult } from '@/lib/circles';

type Values = { name: string; amount: string; months: string; startDate: string };
type Errors = Partial<Record<keyof Values, string>>;

const EXAMPLE = 'Create a 5-month circle for 40 dinars each starting next month';
const blank = (): Values => ({ name: '', amount: '', months: '6', startDate: format(addMonths(startOfMonth(new Date()), 1), 'yyyy-MM-dd') });

export function NewCircleDialog({ open, onOpenChange, onCreate }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (v: { name: string; amount: number; months: number; startDate: string }) => void;
}) {
  const [values, setValues] = useState<Values>(blank);
  const [errors, setErrors] = useState<Errors>({});
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);

  const reset = () => { setValues(blank()); setErrors({}); setPrompt(''); setResult(null); };
  const set = (k: keyof Values, v: string) => { setValues((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const runAssistant = () => {
    if (!prompt.trim()) { setResult({ ok: false, fields: {}, understood: [], missing: ['a description of your circle'] }); return; }
    const r = parsePrompt(prompt);
    setResult(r);
    if (r.understood.length) {
      setValues((p) => ({
        name: r.fields.name ?? p.name,
        amount: r.fields.amount != null ? String(r.fields.amount) : p.amount,
        months: r.fields.months != null ? String(r.fields.months) : p.months,
        startDate: r.fields.startDate ?? p.startDate,
      }));
      setErrors({});
    }
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const e: Errors = {};
    const amount = Number(values.amount);
    const months = Number(values.months);
    if (values.name.trim().length < 2) e.name = 'Give the circle a name (at least 2 characters).';
    else if (values.name.trim().length > 50) e.name = 'Keep the name under 50 characters.';
    if (!values.amount || !Number.isFinite(amount) || amount <= 0) e.amount = 'Enter an amount greater than 0 KWD.';
    else if (amount > 10000) e.amount = 'Maximum is 10,000 KWD per month.';
    else if (!/^\d+(\.\d{1,3})?$/.test(values.amount)) e.amount = 'Use up to 3 decimals (fils).';
    if (!Number.isInteger(months) || months < 2 || months > 24) e.months = 'Choose between 2 and 24 months.';
    if (!values.startDate || Number.isNaN(Date.parse(values.startDate))) e.startDate = 'Pick a valid start date.';
    setErrors(e);
    if (Object.keys(e).length) return;
    onCreate({ name: values.name.trim(), amount, months, startDate: values.startDate });
    reset();
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
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-xl gap-0 rounded-3xl p-0 bg-card">
        <DialogHeader className="px-6 pb-4 pt-6 text-left">
          <DialogTitle className="text-xl font-extrabold tracking-tight">Start a new circle</DialogTitle>
          <DialogDescription>Describe it in a sentence, or fill the details yourself.</DialogDescription>
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
                    <span>Filled: {result.understood.join(', ')}. Review below before creating.</span>
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
            {field('amount', 'Monthly Contribution', { inputMode: 'decimal', placeholder: '50' }, 'KWD')}
            {field('months', 'Months / Members', { type: 'number', min: 2, max: 24, inputMode: 'numeric' })}
          </div>
          {field('startDate', 'Start Date', { type: 'date' })}
          {Number(values.amount) > 0 && Number(values.months) >= 2 && (
            <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
              Each month one member receives <span className="num font-semibold text-foreground">{(Number(values.amount) * Number(values.months)).toLocaleString('en-US', { minimumFractionDigits: 3 })} KWD</span>.
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => { onOpenChange(false); reset(); }} data-testid="button-cancel-create">Cancel</Button>
            <Button type="submit" className="h-11 rounded-xl px-6" data-testid="button-create-circle">Create circle</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
