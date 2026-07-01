-- ThirtyMilestones — prepare for the in-app import. Run once in the SQL Editor.
-- (Only needed because the first schema used expression indexes; this switches
--  them to plain-column unique indexes so the app's upserts can de-duplicate.)

drop index if exists public.tasks_dedupe_idx;
create unique index tasks_dedupe_idx on public.tasks (list_id, doer_name, title, planned_date);

drop index if exists public.doers_name_key;
create unique index doers_name_key on public.doers (name);

-- TEMPORARY (until Supabase Auth is wired in): let the app read/write with its
-- anon key while we still use the existing login. This matches today's security
-- posture (client-side auth). Strict Row-Level Security is re-enabled in the
-- auth phase.
alter table public.doers disable row level security;
alter table public.lists disable row level security;
alter table public.tasks disable row level security;
