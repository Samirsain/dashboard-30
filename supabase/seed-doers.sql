-- ThirtyMilestones — import the active doers into Supabase.
-- Run in Supabase → SQL Editor. Safe to re-run (on conflict do nothing).
-- Ex-staff (LAXMI, KIRTI, SAHIL) are intentionally excluded.

insert into public.doers (name, department, mobile, email) values
  ('SAMIR',   'MIS',        '9057790030', 'mis.thirtymilestones@gmail.com'),
  ('PRIYA',   'EA',         '9610930030', 'ea.thirtymilestones@gmail.com'),
  ('SHIKHA',  'HR',         '9376570030', 'hr.thirtymilestones@gmail.com'),
  ('DEEPAK',  'SUPERVISOR', '9376270030', 'supervisor.thirtymilestones@gmail.com'),
  ('SANDEEP', 'PS',         '9376970030', 'ps.thirtymilestones@gmail.com'),
  ('DRIVER',  'CHAUFFEUR',  '9610370030', 'chauffeur.thirtymilestones@gmail.com')
on conflict do nothing;
