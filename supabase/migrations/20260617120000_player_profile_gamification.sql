-- Public profile gamification: total XP (quiz + freestyle challenge) and freestyle badge flag.

create or replace function public.goalnova_public_player_profile_gamification(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with freestyle_challenge as (
    select c.id as challenge_id
    from public.challenges c
    where c.slug = 'freestyle-challenge'
      and c.status in ('active', 'ended')
    limit 1
  ),
  has_freestyle_badge as (
    select exists (
      select 1
      from public.challenge_entries ce
      join freestyle_challenge fc on fc.challenge_id = ce.challenge_id
      join public.videos v on v.id = ce.video_id
      where ce.user_id = p_user_id
        and public.goalnova_video_has_playable_url(v)
        and public.goalnova_user_is_active(p_user_id)
    ) as earned
  ),
  freestyle_xp as (
    select case when (select earned from has_freestyle_badge) then 75 else 0 end as xp
  ),
  quiz_xp as (
    select public.goalnova_quiz_total_xp(p_user_id) as xp
  )
  select jsonb_build_object(
    'total_xp', (select xp from quiz_xp) + (select xp from freestyle_xp),
    'freestyle_badge', (select earned from has_freestyle_badge)
  );
$$;

comment on function public.goalnova_public_player_profile_gamification(uuid) is
  'Public player profile stats: quiz XP + freestyle challenge XP (75) and freestyle badge earned flag.';

revoke all on function public.goalnova_public_player_profile_gamification(uuid) from public;
grant execute on function public.goalnova_public_player_profile_gamification(uuid) to anon, authenticated;
