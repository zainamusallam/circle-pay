create table public.circle_pay_circles (
  user_id uuid not null references auth.users (id) on delete cascade,
  circle_id text not null,
  record_type text not null check (record_type in ('rotation', 'public_listing')),
  visibility text not null check (visibility in ('private', 'public')),
  name text not null,
  goal numeric(14, 3) not null check (goal >= 0),
  monthly_contribution numeric(14, 3) not null default 0 check (monthly_contribution >= 0),
  member_count integer not null check (member_count >= 0 and member_count <= 24),
  capacity integer not null check (capacity between 2 and 24),
  start_date date not null,
  auto_debit boolean not null default false,
  invite_code text,
  created_at timestamptz not null default now(),
  primary key (user_id, circle_id)
);

create table public.circle_pay_circle_members (
  user_id uuid not null,
  circle_id text not null,
  seat_number integer not null check (seat_number between 1 and 24),
  member_name text not null check (length(trim(member_name)) between 1 and 60),
  primary key (user_id, circle_id, seat_number),
  foreign key (user_id, circle_id)
    references public.circle_pay_circles (user_id, circle_id) on delete cascade
);

create table public.circle_pay_rotation_months (
  user_id uuid not null,
  circle_id text not null,
  month_number integer not null check (month_number between 1 and 24),
  due_date date not null,
  recipient_name text not null,
  paid boolean not null default false,
  collected boolean not null default false,
  queued_at timestamptz,
  released_at timestamptz,
  primary key (user_id, circle_id, month_number),
  foreign key (user_id, circle_id)
    references public.circle_pay_circles (user_id, circle_id) on delete cascade
);

create table public.circle_pay_contributions (
  user_id uuid not null,
  circle_id text not null,
  month_number integer not null,
  member_name text not null,
  amount numeric(14, 3) not null check (amount > 0),
  contributed_at timestamptz not null,
  primary key (user_id, circle_id, month_number, member_name),
  foreign key (user_id, circle_id, month_number)
    references public.circle_pay_rotation_months (user_id, circle_id, month_number) on delete cascade
);

create table public.circle_pay_wallets (
  user_id uuid not null references auth.users (id) on delete cascade,
  member_name text not null check (length(trim(member_name)) between 1 and 60),
  bank_name text not null,
  masked_last_four text not null check (masked_last_four ~ '^[0-9]{4}$'),
  balance numeric(14, 3) not null check (balance >= 0),
  primary key (user_id, member_name)
);

create table public.circle_pay_transactions (
  user_id uuid not null references auth.users (id) on delete cascade,
  transaction_id text not null,
  circle_id text not null,
  circle_name text not null,
  month_number integer not null check (month_number between 1 and 24),
  member_name text not null,
  kind text not null check (kind in ('debit', 'queued', 'transfer', 'failed')),
  amount numeric(14, 3) not null check (amount >= 0),
  occurred_at timestamptz not null,
  message text not null,
  primary key (user_id, transaction_id)
);

create table public.circle_pay_public_requests (
  user_id uuid not null,
  circle_id text not null,
  request_id text not null,
  requester_name text not null,
  requested_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  primary key (user_id, circle_id, request_id),
  foreign key (user_id, circle_id)
    references public.circle_pay_circles (user_id, circle_id) on delete cascade
);

create table public.circle_pay_join_requests (
  user_id uuid not null references auth.users (id) on delete cascade,
  circle_id text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  requested_at timestamptz not null default now(),
  primary key (user_id, circle_id)
);

create table public.circle_pay_simulation_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  simulated_date date not null,
  last_run_at timestamptz,
  debited numeric(14, 3) not null default 0 check (debited >= 0),
  secured integer not null default 0 check (secured >= 0),
  failed integer not null default 0 check (failed >= 0),
  skipped integer not null default 0 check (skipped >= 0)
);

create index circle_pay_circles_user_start_date_idx
  on public.circle_pay_circles (user_id, start_date);
create index circle_pay_transactions_user_occurred_at_idx
  on public.circle_pay_transactions (user_id, occurred_at desc);
create index circle_pay_public_requests_user_status_idx
  on public.circle_pay_public_requests (user_id, status);

alter table public.circle_pay_circles enable row level security;
alter table public.circle_pay_circle_members enable row level security;
alter table public.circle_pay_rotation_months enable row level security;
alter table public.circle_pay_contributions enable row level security;
alter table public.circle_pay_wallets enable row level security;
alter table public.circle_pay_transactions enable row level security;
alter table public.circle_pay_public_requests enable row level security;
alter table public.circle_pay_join_requests enable row level security;
alter table public.circle_pay_simulation_state enable row level security;

grant select, insert, update, delete on
  public.circle_pay_circles,
  public.circle_pay_circle_members,
  public.circle_pay_rotation_months,
  public.circle_pay_contributions,
  public.circle_pay_wallets,
  public.circle_pay_transactions,
  public.circle_pay_public_requests,
  public.circle_pay_join_requests,
  public.circle_pay_simulation_state
to authenticated;

create policy "Users manage their own circles"
  on public.circle_pay_circles for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users manage their own circle members"
  on public.circle_pay_circle_members for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users manage their own rotation months"
  on public.circle_pay_rotation_months for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users manage their own contributions"
  on public.circle_pay_contributions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users manage their own wallets"
  on public.circle_pay_wallets for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users manage their own transactions"
  on public.circle_pay_transactions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users manage their own public requests"
  on public.circle_pay_public_requests for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users manage their own join requests"
  on public.circle_pay_join_requests for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users manage their own simulation state"
  on public.circle_pay_simulation_state for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.sync_circle_pay_normalized_state(
  p_funding jsonb,
  p_public_circles jsonb,
  p_join_requests jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_last_run jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Sign in to sync Circle Pay data.';
  end if;
  if p_funding is null or pg_catalog.jsonb_typeof(p_funding) <> 'object'
     or pg_catalog.jsonb_typeof(coalesce(p_funding->'circles', '[]'::jsonb)) <> 'array'
     or pg_catalog.jsonb_typeof(coalesce(p_public_circles, '[]'::jsonb)) <> 'array'
     or pg_catalog.jsonb_typeof(coalesce(p_join_requests, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'Invalid Circle Pay state.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 0));

  delete from public.circle_pay_public_requests where user_id = v_user_id;
  delete from public.circle_pay_join_requests where user_id = v_user_id;
  delete from public.circle_pay_transactions where user_id = v_user_id;
  delete from public.circle_pay_wallets where user_id = v_user_id;
  delete from public.circle_pay_circles where user_id = v_user_id;
  delete from public.circle_pay_simulation_state where user_id = v_user_id;

  insert into public.circle_pay_circles (
    user_id, circle_id, record_type, visibility, name, goal, monthly_contribution,
    member_count, capacity, start_date, auto_debit, invite_code
  )
  select
    v_user_id,
    circle_doc.value->>'id',
    'rotation',
    'private',
    coalesce(nullif(circle_doc.value->>'name', ''), 'Circle'),
    coalesce(nullif(circle_doc.value->>'goal', ''), '0')::numeric,
    coalesce(nullif(circle_doc.value->>'amount', ''), '0')::numeric,
    pg_catalog.jsonb_array_length(coalesce(circle_doc.value->'members', '[]'::jsonb)),
    coalesce(nullif(circle_doc.value->>'months', ''), '2')::integer,
    (circle_doc.value->>'startDate')::date,
    coalesce((circle_doc.value->>'autoDebit')::boolean, false),
    nullif(circle_doc.value->>'inviteCode', '')
  from pg_catalog.jsonb_array_elements(coalesce(p_funding->'circles', '[]'::jsonb)) as circle_doc(value)
  where nullif(circle_doc.value->>'id', '') is not null;

  insert into public.circle_pay_circles (
    user_id, circle_id, record_type, visibility, name, goal, monthly_contribution,
    member_count, capacity, start_date, auto_debit, invite_code
  )
  select
    v_user_id,
    public_doc.value->>'id',
    'public_listing',
    'public',
    coalesce(nullif(public_doc.value->>'name', ''), 'Open Circle'),
    coalesce(nullif(public_doc.value->>'goal', ''), '0')::numeric,
    0,
    pg_catalog.jsonb_array_length(coalesce(public_doc.value->'members', '[]'::jsonb)),
    (public_doc.value->>'capacity')::integer,
    (public_doc.value->>'startDate')::date,
    false,
    null
  from pg_catalog.jsonb_array_elements(coalesce(p_public_circles, '[]'::jsonb)) as public_doc(value)
  where nullif(public_doc.value->>'id', '') is not null;

  insert into public.circle_pay_circle_members (user_id, circle_id, seat_number, member_name)
  select v_user_id, circle_doc.value->>'id', member_doc.position::integer, member_doc.value #>> '{}'
  from pg_catalog.jsonb_array_elements(coalesce(p_funding->'circles', '[]'::jsonb)) as circle_doc(value)
  cross join lateral pg_catalog.jsonb_array_elements(coalesce(circle_doc.value->'members', '[]'::jsonb))
    with ordinality as member_doc(value, position);

  insert into public.circle_pay_circle_members (user_id, circle_id, seat_number, member_name)
  select v_user_id, public_doc.value->>'id', member_doc.position::integer, member_doc.value #>> '{}'
  from pg_catalog.jsonb_array_elements(coalesce(p_public_circles, '[]'::jsonb)) as public_doc(value)
  cross join lateral pg_catalog.jsonb_array_elements(coalesce(public_doc.value->'members', '[]'::jsonb))
    with ordinality as member_doc(value, position);

  insert into public.circle_pay_rotation_months (
    user_id, circle_id, month_number, due_date, recipient_name, paid, collected, queued_at, released_at
  )
  select
    v_user_id,
    circle_doc.value->>'id',
    (month_doc.value->>'month')::integer,
    (month_doc.value->>'date')::date,
    coalesce(month_doc.value->>'recipient', 'User'),
    coalesce((month_doc.value->>'paid')::boolean, false),
    coalesce((month_doc.value->>'collected')::boolean, false),
    nullif(month_doc.value->'funding'->>'queuedAt', '')::timestamptz,
    nullif(month_doc.value->'funding'->>'releasedAt', '')::timestamptz
  from pg_catalog.jsonb_array_elements(coalesce(p_funding->'circles', '[]'::jsonb)) as circle_doc(value)
  cross join lateral pg_catalog.jsonb_array_elements(coalesce(circle_doc.value->'schedule', '[]'::jsonb))
    as month_doc(value);

  insert into public.circle_pay_contributions (
    user_id, circle_id, month_number, member_name, amount, contributed_at
  )
  select
    v_user_id,
    circle_doc.value->>'id',
    (month_doc.value->>'month')::integer,
    contribution_doc.value->>'member',
    (contribution_doc.value->>'amount')::numeric,
    (contribution_doc.value->>'timestamp')::timestamptz
  from pg_catalog.jsonb_array_elements(coalesce(p_funding->'circles', '[]'::jsonb)) as circle_doc(value)
  cross join lateral pg_catalog.jsonb_array_elements(coalesce(circle_doc.value->'schedule', '[]'::jsonb))
    as month_doc(value)
  cross join lateral pg_catalog.jsonb_array_elements(
    coalesce(month_doc.value->'funding'->'payments', '[]'::jsonb)
  ) as contribution_doc(value);

  insert into public.circle_pay_wallets (user_id, member_name, bank_name, masked_last_four, balance)
  select
    v_user_id,
    wallet_doc.value->>'member',
    coalesce(wallet_doc.value->>'bank', 'Demo wallet'),
    wallet_doc.value->>'last4',
    coalesce(nullif(wallet_doc.value->>'balance', ''), '0')::numeric
  from pg_catalog.jsonb_array_elements(coalesce(p_funding->'wallets', '[]'::jsonb)) as wallet_doc(value);

  insert into public.circle_pay_transactions (
    user_id, transaction_id, circle_id, circle_name, month_number,
    member_name, kind, amount, occurred_at, message
  )
  select
    v_user_id,
    transaction_doc.value->>'id',
    transaction_doc.value->>'circleId',
    transaction_doc.value->>'circleName',
    (transaction_doc.value->>'month')::integer,
    transaction_doc.value->>'member',
    transaction_doc.value->>'kind',
    coalesce(nullif(transaction_doc.value->>'amount', ''), '0')::numeric,
    (transaction_doc.value->>'timestamp')::timestamptz,
    coalesce(transaction_doc.value->>'message', '')
  from pg_catalog.jsonb_array_elements(coalesce(p_funding->'transactions', '[]'::jsonb)) as transaction_doc(value);

  insert into public.circle_pay_public_requests (
    user_id, circle_id, request_id, requester_name, requested_at, status
  )
  select
    v_user_id,
    public_doc.value->>'id',
    request_doc.value->>'id',
    coalesce(request_doc.value->>'requester', 'Demo participant'),
    coalesce(nullif(request_doc.value->>'createdAt', '')::timestamptz, pg_catalog.now()),
    'pending'
  from pg_catalog.jsonb_array_elements(coalesce(p_public_circles, '[]'::jsonb)) as public_doc(value)
  cross join lateral pg_catalog.jsonb_array_elements(coalesce(public_doc.value->'requests', '[]'::jsonb))
    as request_doc(value);

  insert into public.circle_pay_join_requests (user_id, circle_id, status)
  select v_user_id, requested_id.value, 'pending'
  from pg_catalog.jsonb_array_elements_text(coalesce(p_join_requests, '[]'::jsonb)) as requested_id(value);

  v_last_run := p_funding->'lastRun';
  insert into public.circle_pay_simulation_state (
    user_id, simulated_date, last_run_at, debited, secured, failed, skipped
  )
  values (
    v_user_id,
    (p_funding->>'simulatedDate')::date,
    nullif(v_last_run->>'timestamp', '')::timestamptz,
    coalesce(nullif(v_last_run->>'debited', '')::numeric, 0),
    coalesce(nullif(v_last_run->>'secured', '')::integer, 0),
    coalesce(nullif(v_last_run->>'failed', '')::integer, 0),
    coalesce(nullif(v_last_run->>'skipped', '')::integer, 0)
  );
end;
$function$;

revoke all on function public.sync_circle_pay_normalized_state(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.sync_circle_pay_normalized_state(jsonb, jsonb, jsonb) to authenticated;
