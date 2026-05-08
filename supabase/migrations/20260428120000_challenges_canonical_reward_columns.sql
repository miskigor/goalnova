-- Canonical reward copy column: `reward_detail` (app + database.types.ts).
-- Renames legacy `reward_description` → `reward_detail` if present; never query both names from clients.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'challenges' and column_name = 'reward_description'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'challenges' and column_name = 'reward_detail'
  ) then
    alter table public.challenges rename column reward_description to reward_detail;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'challenges' and column_name = 'reward_description'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'challenges' and column_name = 'reward_detail'
  ) then
    update public.challenges
    set reward_detail = coalesce(
      nullif(trim(reward_detail), ''),
      nullif(trim(reward_description), '')
    );
    alter table public.challenges drop column reward_description;
  end if;
end $$;

alter table public.challenges
  add column if not exists reward_title text,
  add column if not exists reward_detail text,
  add column if not exists reward_type text,
  add column if not exists reward_image_url text;

comment on column public.challenges.reward_detail is
  'Longer prize copy. Canonical name is reward_detail (not reward_description).';
