-- ============================================================================
-- ThirtyMilestones MIS — Supabase (Postgres) schema
-- Run this ONCE in Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).
-- No secrets here — this only defines tables, indexes and access rules.
-- ============================================================================

-- ── DOERS (the people who do the tasks) ────────────────────────────────────
create table if not exists public.doers (
  id          bigint generated always as identity primary key,
  name        text not null,
  department  text,
  mobile      text,
  email       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index if not exists doers_name_key on public.doers (name);

-- ── LISTS (each "sheet": main Task List, main Checklist, or any extra list) ─
create table if not exists public.lists (
  id          bigint generated always as identity primary key,
  name        text not null,
  kind        text not null check (kind in ('tasklist','checklist')),
  is_default  boolean not null default false,
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ── TASKS (the actual work items) ──────────────────────────────────────────
create table if not exists public.tasks (
  id            bigint generated always as identity primary key,
  list_id       bigint not null references public.lists(id) on delete cascade,
  doer_id       bigint references public.doers(id) on delete set null,
  doer_name     text,               -- denormalised (handy for display + import)
  title         text not null,
  department    text,
  priority      text,               -- Task List
  frequency     text,               -- Checklist
  planned_date  date,               -- first / planned date  (= the due date)
  revised_date  date,               -- latest revision (Task List)
  revisions     int not null default 0,
  actual_date   date,               -- completion date
  status        text not null default 'Pending'
                check (status in ('Pending','Completed','Week Shifted')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists tasks_list_idx   on public.tasks (list_id);
create index if not exists tasks_doer_idx   on public.tasks (doer_id);
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_date_idx   on public.tasks (planned_date);

-- Block duplicate adds at the database level (same list + doer + title + date).
-- This is what makes "add the same task twice" impossible — the database itself
-- refuses it (no more manual dedupe).
create unique index if not exists tasks_dedupe_idx
  on public.tasks (list_id, doer_name, title, planned_date);

-- ── APP USERS (linked to Supabase Auth) + roles ────────────────────────────
create table if not exists public.app_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique,
  role        text not null default 'employee' check (role in ('admin','pc','ea','employee')),
  doer_id     bigint references public.doers(id),
  created_at  timestamptz not null default now()
);

-- ── WHO CAN SEE / ADD TO WHICH LIST ────────────────────────────────────────
create table if not exists public.user_list_access (
  user_id  uuid   references public.app_users(id) on delete cascade,
  list_id  bigint references public.lists(id) on delete cascade,
  can_add  boolean not null default false,
  primary key (user_id, list_id)
);

-- keep tasks.updated_at fresh
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
drop trigger if exists tasks_touch on public.tasks;
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- ROW-LEVEL SECURITY  (this is the proper per-doer/per-list access control)
-- ============================================================================
create or replace function public.is_privileged() returns boolean
language sql stable as $$
  select exists (
    select 1 from public.app_users u
    where u.id = auth.uid() and u.role in ('admin','pc','ea')
  );
$$;

alter table public.doers            enable row level security;
alter table public.lists            enable row level security;
alter table public.tasks            enable row level security;
alter table public.app_users        enable row level security;
alter table public.user_list_access enable row level security;

-- doers & lists: the app's login is a custom system (not Supabase Auth), so the
-- browser always talks to Supabase as the "anon" role. Access is gated by the
-- app's own login screen, not by Supabase Auth — so "anon" needs the same
-- access "authenticated" would have had. Keep the "authenticated" policies too
-- for if/when real Supabase Auth gets wired into the login flow.
drop policy if exists doers_read  on public.doers;
drop policy if exists doers_write on public.doers;
create policy doers_read  on public.doers for select to anon, authenticated using (true);
create policy doers_write on public.doers for all    to anon, authenticated using (true) with check (true);

drop policy if exists lists_read  on public.lists;
drop policy if exists lists_write on public.lists;
create policy lists_read  on public.lists for select to anon, authenticated using (true);
create policy lists_write on public.lists for all    to anon, authenticated using (true) with check (true);

-- tasks: anon (app-auth gated) gets full access, same reasoning as above.
-- authenticated keeps the granular per-list rules for a future real-auth setup.
drop policy if exists tasks_read   on public.tasks;
drop policy if exists tasks_insert on public.tasks;
drop policy if exists tasks_update on public.tasks;
drop policy if exists tasks_anon_all on public.tasks;
create policy tasks_anon_all on public.tasks for all to anon using (true) with check (true);
create policy tasks_read on public.tasks for select to authenticated using (
  public.is_privileged()
  or exists (select 1 from public.user_list_access a
             where a.user_id = auth.uid() and a.list_id = tasks.list_id)
);
create policy tasks_insert on public.tasks for insert to authenticated with check (
  public.is_privileged()
  or exists (select 1 from public.user_list_access a
             where a.user_id = auth.uid() and a.list_id = tasks.list_id and a.can_add)
);
create policy tasks_update on public.tasks for update to authenticated using (
  public.is_privileged()
  or exists (select 1 from public.user_list_access a
             where a.user_id = auth.uid() and a.list_id = tasks.list_id)
);

-- app_users: each user sees own row; admin/pc manage all
drop policy if exists app_users_read  on public.app_users;
drop policy if exists app_users_write on public.app_users;
create policy app_users_read  on public.app_users for select to authenticated using (id = auth.uid() or public.is_privileged());
create policy app_users_write on public.app_users for all    to authenticated using (public.is_privileged()) with check (public.is_privileged());

-- access rows: user sees own; admin/pc manage
drop policy if exists access_read  on public.user_list_access;
drop policy if exists access_write on public.user_list_access;
create policy access_read  on public.user_list_access for select to authenticated using (user_id = auth.uid() or public.is_privileged());
create policy access_write on public.user_list_access for all    to authenticated using (public.is_privileged()) with check (public.is_privileged());

-- ── Seed the two default lists (idempotent) ────────────────────────────────
insert into public.lists (name, kind, is_default, sort_order)
select 'Main Task List', 'tasklist', true, 1
where not exists (select 1 from public.lists where kind = 'tasklist' and is_default);
insert into public.lists (name, kind, is_default, sort_order)
select 'Main Checklist', 'checklist', true, 2
where not exists (select 1 from public.lists where kind = 'checklist' and is_default);
