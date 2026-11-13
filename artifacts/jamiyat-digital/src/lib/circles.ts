import { addMonths, format, startOfMonth, parseISO, isValid } from 'date-fns';

export type MonthEntry = {
  month: number;
  date: string; // ISO yyyy-MM-dd
  recipient: string;
  paid: boolean; // Ahmed's contribution for this month
  collected: boolean; // recipient has received the pot
  funding?: {
    payments: { member: string; amount: number; timestamp: string }[];
    queuedAt?: string;
    releasedAt?: string;
  };
};

export type Circle = {
  id: string;
  name: string;
  amount: number;
  goal?: number;
  months: number;
  startDate: string;
  members: string[];
  schedule: MonthEntry[];
  autoDebit: boolean;
};

export type MonthStatus = 'Paid' | 'Pending' | 'Collected' | 'Auto-Paid (Protected Balance Secured)';

export const MEMBER_POOL = [
  'Ahmed', 'Fatima', 'Omar', 'Sara', 'Khalid', 'Noor',
  'Yousef', 'Maryam', 'Hamad', 'Dana', 'Bader', 'Lulwa',
  'Mishari', 'Hessa', 'Abdullah', 'Reem', 'Faisal', 'Shaikha',
  'Nasser', 'Aisha', 'Jassim', 'Latifa', 'Salem', 'Munira',
];

export const fmtKWD = (n: number) =>
  `${n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KWD`;

export const fmtDate = (iso: string) => format(parseISO(iso), 'd MMM yyyy');

// Retain the existing member key so saved receipts and wallet ownership stay intact.
export const displayMember = (name: string) => name === 'Ahmed' || name === 'Ahmed Al-Sabah' ? 'User' : name;

/** The goal is the amount funded by all participants in each monthly rotation. */
export const circleGoal = (c: Circle) =>
  c.goal ?? (c.id === 'family-friends' ? 3000 : c.id === 'office-colleagues' ? 7000 : Math.round(c.amount * c.members.length * 1000) / 1000);

/** Split integer fils as evenly as possible, distributing at most one extra fils per member. */
export function contributionFor(c: Circle, member = 'Ahmed'): number {
  const totalFils = Math.round(circleGoal(c) * 1000);
  const count = c.members.length;
  if (!count) return 0;
  const index = c.members.indexOf(member);
  const remainder = totalFils % count;
  return (Math.floor(totalFils / count) + (index >= 0 && index < remainder ? 1 : 0)) / 1000;
}

export function buildCircle(input: {
  name: string; amount?: number; goal?: number; months: number; startDate: string; members?: string[];
}): Circle {
  const members = input.members ?? Array.from({ length: input.months }, (_, i) => MEMBER_POOL[i % MEMBER_POOL.length] + (i >= MEMBER_POOL.length ? ` ${Math.floor(i / MEMBER_POOL.length) + 1}` : ''));
  const start = parseISO(input.startDate);
  const goal = Math.round((input.goal ?? (input.amount ?? 0) * members.length) * 1000) / 1000;
  if (!Number.isFinite(goal) || goal * 1000 < members.length || members.length < 2) {
    throw new Error('The savings goal must cover at least one fils per participant.');
  }
  const circle: Circle = {
    id: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    amount: 0,
    goal,
    months: members.length,
    startDate: input.startDate,
    members,
    autoDebit: true,
    schedule: members.map((m, i) => ({
      month: i + 1,
      date: format(addMonths(start, i), 'yyyy-MM-dd'),
      recipient: m,
      paid: false,
      collected: false,
    })),
  };
  circle.amount = contributionFor(circle);
  return circle;
}

export function seedCircles(): Circle[] {
  const base = startOfMonth(new Date());
  const fam = buildCircle({
    name: 'Family & Friends Circle', goal: 3000, months: 6,
    startDate: format(addMonths(base, -2), 'yyyy-MM-dd'),
    members: ['Fatima', 'Ahmed', 'Omar', 'Sara', 'Khalid', 'Noor'],
  });
  fam.id = 'family-friends';
  fam.schedule = fam.schedule.map((e, i) => ({ ...e, paid: i < 2, collected: i < 2 }));
  const office = buildCircle({
    name: 'Office Colleagues', goal: 7000, months: 7,
    startDate: format(addMonths(base, -1), 'yyyy-MM-dd'),
    members: ['Khalid', 'Noor', 'Ahmed', 'Yousef', 'Maryam', 'Hamad', 'Sara'],
  });
  office.id = 'office-colleagues';
  office.schedule = office.schedule.map((e, i) => ({ ...e, paid: i < 1, collected: i < 1 }));
  return [fam, office];
}

export const statusOf = (e: MonthEntry): MonthStatus => (e.collected ? 'Collected' : e.funding?.queuedAt ? 'Auto-Paid (Protected Balance Secured)' : e.funding ? 'Pending' : e.paid ? 'Paid' : 'Pending');

export function circleStats(c: Circle) {
  const paidCount = c.schedule.filter((e) => e.paid).length;
  const collectedCount = c.schedule.filter((e) => e.collected).length;
  const current = c.schedule.find((e) => !e.collected) ?? null;
  const nextUnpaid = c.schedule.find((e) => !e.paid) ?? null;
  const ahmedTurn = c.schedule.find((e) => e.recipient === 'Ahmed') ?? null;
  return {
    paidCount,
    collectedCount,
    contributed: Math.round(c.schedule.reduce((sum, e) => sum + (e.paid
      ? e.funding?.payments.find((p) => p.member === 'Ahmed')?.amount ?? contributionFor(c)
      : 0), 0) * 1000) / 1000,
    contribution: contributionFor(c),
    goal: circleGoal(c),
    pot: circleGoal(c),
    progress: c.months ? collectedCount / c.months : 0,
    current,
    nextUnpaid,
    ahmedTurn,
    complete: collectedCount === c.months,
  };
}

/* ---------------- Rule-based assistant (demo, no external AI) ---------------- */

const WORD_NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100,
};
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

const toNum = (s: string) => (WORD_NUM[s.toLowerCase()] ?? Number(s));
const monthIdx = (s: string) => MONTHS.findIndex((m) => m.startsWith(s.toLowerCase().slice(0, 3)));

export type ParseResult = {
  ok: boolean;
  fields: Partial<{ name: string; amount: number; months: number; startDate: string }>;
  understood: string[];
  missing: string[];
};

export function parsePrompt(text: string, today = new Date()): ParseResult {
  const t = ' ' + text.toLowerCase().replace(/[,]/g, ' ') + ' ';
  const fields: ParseResult['fields'] = {};
  const understood: string[] = [];
  const NUM = '(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|hundred)';

  // months / members
  const mm = t.match(new RegExp(`${NUM}[\\s-]*(?:months?|members?|people|persons?|participants?)\\b`));
  if (mm) {
    const n = toNum(mm[1]);
    if (n >= 2 && n <= 24) { fields.months = n; understood.push(`${n} months / members`); }
  }

  // amount
  const am =
    t.match(/(\d+(?:\.\d{1,3})?)\s*(?:kwd|kd|dinars?|dinar)\b/) ||
    t.match(/(?:kwd|kd)\s*(\d+(?:\.\d{1,3})?)/) ||
    t.match(new RegExp(`\\b${NUM}\\s*(?:kwd|kd|dinars?)\\b`)) ||
    t.match(/(?:for|of|contribute|contribution|pay|paying)\s+(\d+(?:\.\d{1,3})?)\s*(?:each|per|a month|monthly|every)/);
  if (am) {
    const n = toNum(am[1]);
    if (n > 0) { fields.amount = n; understood.push(`${n} KWD per month`); }
  }

  // start date
  const base = startOfMonth(today);
  let start: Date | null = null;
  if (/next month/.test(t)) start = addMonths(base, 1);
  else if (/this month|today|now|immediately/.test(t)) start = base;
  else {
    const iso = t.match(/(\d{4}-\d{2}-\d{2})/);
    const dm = t.match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_RE}(?:\\s+(\\d{4}))?`));
    const md = t.match(new RegExp(`${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(\\d{4}))?`));
    const mo = t.match(new RegExp(`(?:in|from|starting|start|on)\\s+(?:in\\s+)?${MONTH_RE}(?:\\s+(\\d{4}))?\\b`));
    const slash = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    const resolve = (mi: number, day: number, yr?: string) => {
      let y = yr ? Number(yr) : today.getFullYear();
      let d = new Date(y, mi, day);
      if (!yr && d < base) { y += 1; d = new Date(y, mi, day); }
      return d;
    };
    if (iso) start = parseISO(iso[1]);
    else if (slash) start = new Date(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1]));
    else if (dm) start = resolve(monthIdx(dm[2]), Number(dm[1]), dm[3]);
    else if (md) start = resolve(monthIdx(md[1]), Number(md[2]), md[3]);
    else if (mo) start = resolve(monthIdx(mo[1]), 1, mo[2]);
  }
  if (start && isValid(start)) {
    fields.startDate = format(start, 'yyyy-MM-dd');
    understood.push(`starts ${format(start, 'd MMM yyyy')}`);
  }

  // name
  const nm = text.match(/(?:called|named|name it|titled)\s+["“']?([^"”'.]+?)["”']?(?=\s+(?:for|with|of|starting|from|on|at|that|and)\b|[.]|$)/i);
  if (nm && nm[1].trim()) {
    fields.name = nm[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
    understood.push(`named "${fields.name}"`);
  } else if (fields.months || fields.amount) {
    const who = /family/.test(t) ? 'Family' : /office|work|colleague/.test(t) ? 'Office' : /friend/.test(t) ? 'Friends' : null;
    fields.name = who
      ? `${who} Circle${fields.months ? ` (${fields.months} months)` : ''}`
      : `${fields.months ?? ''}${fields.months ? '-Month ' : ''}${fields.amount ? `${fields.amount} KWD ` : ''}Circle`.trim();
  }

  const missing: string[] = [];
  if (!fields.amount) missing.push('monthly amount (e.g. "40 dinars")');
  if (!fields.months) missing.push('number of months (e.g. "5-month")');
  if (!fields.startDate) missing.push('start date (e.g. "next month" or "1 March")');

  return { ok: understood.length > 0 && !!fields.amount && !!fields.months, fields, understood, missing };
}
