alter table public.challenges
  add column if not exists instructions text,
  add column if not exists max_video_duration_seconds integer,
  add column if not exists equipment jsonb,
  add column if not exists rules_json jsonb,
  add column if not exists scoring jsonb,
  add column if not exists badge text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'challenges_max_video_duration_positive'
      and conrelid = 'public.challenges'::regclass
  ) then
    alter table public.challenges
      add constraint challenges_max_video_duration_positive
      check (max_video_duration_seconds is null or max_video_duration_seconds > 0);
  end if;
end $$;

