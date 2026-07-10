-- Challenge completion XP: count from videos.challenge_id (same source as challenge feed).
-- Backfill missing challenge_entries rows for legacy uploads.

create or replace function public.goalnova_challenge_slug_completion_xp(p_slug text)
returns int
language sql
immutable
set search_path = public
as $$
  select case trim(coalesce(p_slug, ''))
    when 'freestyle-challenge' then 75
    when 'sprint-20m-challenge' then 50
    when 'keepy-ups-challenge' then 50
    when 'dribbling-slalom-challenge' then 50
    when 'weak-foot-pass-challenge' then 50
    when 'crossbar-challenge' then 50
    else 0
  end;
$$;

comment on function public.goalnova_challenge_slug_completion_xp(text) is
  'Base completion XP for a challenge slug (one grant per challenge per player).';

create or replace function public.goalnova_challenge_submissions_xp(p_user_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(xp), 0)::int
  from (
    select distinct on (c.id)
      public.goalnova_challenge_slug_completion_xp(c.slug) as xp
    from public.videos v
    join public.challenges c on c.id = v.challenge_id
    where v.user_id = p_user_id
      and v.challenge_id is not null
      and c.status in ('active', 'ended')
      and public.goalnova_video_has_playable_url(v)
      and public.goalnova_user_is_active(p_user_id)
      and public.goalnova_challenge_slug_completion_xp(c.slug) > 0
    order by c.id, v.created_at desc
  ) per_challenge;
$$;

comment on function public.goalnova_challenge_submissions_xp(uuid) is
  'Sum of completion XP from challenge video uploads (max once per challenge).';

-- Legacy rows: video tagged with challenge_id but no junction entry.
insert into public.challenge_entries (challenge_id, video_id, user_id)
select v.challenge_id, v.id, v.user_id
from public.videos v
join public.challenges c on c.id = v.challenge_id
where v.challenge_id is not null
  and public.goalnova_video_has_playable_url(v)
  and not exists (
    select 1 from public.challenge_entries ce where ce.video_id = v.id
  )
on conflict do nothing;

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
      from public.videos v
      join freestyle_challenge fc on fc.challenge_id = v.challenge_id
      where v.user_id = p_user_id
        and public.goalnova_video_has_playable_url(v)
        and public.goalnova_user_is_active(p_user_id)
    ) as earned
  ),
  quiz_xp as (
    select public.goalnova_quiz_total_xp(p_user_id) as xp
  ),
  challenge_xp as (
    select public.goalnova_challenge_submissions_xp(p_user_id) as xp
  ),
  friend_bonus_xp as (
    select coalesce(sum(cs.xp), 0)::int as xp
    from public.challenge_scores cs
    where cs.user_id = p_user_id
  )
  select jsonb_build_object(
    'total_xp',
      (select xp from quiz_xp)
      + (select xp from challenge_xp)
      + (select xp from friend_bonus_xp),
    'freestyle_badge', (select earned from has_freestyle_badge)
  );
$$;

comment on function public.goalnova_public_player_profile_gamification(uuid) is
  'Public player profile stats: quiz XP + challenge submission XP + friend-challenge bonuses, and freestyle badge flag.';

revoke all on function public.goalnova_challenge_slug_completion_xp(text) from public;
revoke all on function public.goalnova_challenge_submissions_xp(uuid) from public;

grant execute on function public.goalnova_challenge_slug_completion_xp(text) to anon, authenticated;
grant execute on function public.goalnova_challenge_submissions_xp(uuid) to anon, authenticated;
