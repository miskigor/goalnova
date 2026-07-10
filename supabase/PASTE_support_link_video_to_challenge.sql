-- Support: link an existing video to a challenge so completion XP counts.
-- Use when a player uploaded via /upload without selecting a challenge.
--
-- 1) Replace VIDEO_ID, USER_ID, CHALLENGE_ID below.
-- 2) Run in Supabase Dashboard → SQL Editor.
--
-- Example (adam → sprint 20m, Jul 2026):
--   video:  5be77546-24c0-4ed4-b17c-0c136b74c0b6
--   user:   f0cd46bc-0523-4fe9-97cf-258a7c0f2e23
--   sprint: 134e3849-ffc2-4ca9-b372-e62d2cc5288a

-- Verify before update:
-- select v.id, v.user_id, v.challenge_id, c.slug
-- from public.videos v
-- left join public.challenges c on c.id = v.challenge_id
-- where v.id = 'VIDEO_ID'::uuid;

update public.videos v
set challenge_id = 'CHALLENGE_ID'::uuid
where v.id = 'VIDEO_ID'::uuid
  and v.user_id = 'USER_ID'::uuid
  and v.challenge_id is null;

insert into public.challenge_entries (challenge_id, video_id, user_id)
select v.challenge_id, v.id, v.user_id
from public.videos v
where v.id = 'VIDEO_ID'::uuid
  and v.challenge_id is not null
on conflict do nothing;

-- Verify XP after update:
-- select public.goalnova_challenge_submissions_xp('USER_ID'::uuid);
-- select public.goalnova_public_player_profile_gamification('USER_ID'::uuid);
