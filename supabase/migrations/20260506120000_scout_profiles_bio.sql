-- Align DB with app types: scout profile editor saves `bio`.
alter table public.scout_profiles
  add column if not exists bio text;

comment on column public.scout_profiles.bio is
  'Optional scout biography shown on profile / settings.';
