-- Player Instagram on public profiles.

alter table public.player_profiles
  add column if not exists instagram text;

comment on column public.player_profiles.instagram is
  'Instagram username (no @). Public profile links open Instagram.';

create or replace function public.goalnova_public_player_instagram(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(pp.instagram), '')
  from public.player_profiles pp
  where pp.id = p_user_id
    and public.goalnova_user_is_active(pp.id);
$$;

comment on function public.goalnova_public_player_instagram(uuid) is
  'Public-safe Instagram username for a player profile.';

revoke all on function public.goalnova_public_player_instagram(uuid) from public;
grant execute on function public.goalnova_public_player_instagram(uuid) to anon, authenticated;
