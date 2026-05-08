alter table public.challenges
  add column if not exists translations jsonb;

