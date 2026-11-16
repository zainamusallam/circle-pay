create table if not exists public.circle_pay_user_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  state_key text not null check (state_key in ('funding', 'public_circles', 'join_requests')),
  state jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, state_key)
);

alter table public.circle_pay_user_state enable row level security;

grant select, insert, update, delete
  on public.circle_pay_user_state
  to authenticated;

create policy "Users can read their own Circle Pay state"
  on public.circle_pay_user_state
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own Circle Pay state"
  on public.circle_pay_user_state
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own Circle Pay state"
  on public.circle_pay_user_state
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own Circle Pay state"
  on public.circle_pay_user_state
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
