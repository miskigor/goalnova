insert into public.challenges (
  slug,
  title,
  description,
  instructions,
  max_video_duration_seconds,
  equipment,
  rules_json,
  scoring,
  badge,
  rules,
  reward,
  reward_title,
  reward_detail,
  reward_type,
  status
)
values (
  'keepy-ups-challenge',
  'Keepy-Ups Challenge',
  'Complete 10 consecutive touches without dropping the ball.',
  'Juggle the ball 10 times in a row without letting it touch the ground. Start from the ground or your hands. Keep your full body and the ball visible throughout the video.',
  30,
  '[]'::jsonb,
  '[]'::jsonb,
  null,
  'Keepy-Ups Challenger',
  'Goal:
Complete 10 consecutive touches without dropping the ball.

Rules:
- Start from the ground or from hands.
- The ball must not touch the ground.
- Only 10 consecutive touches count.
- The video must show your full body and the ball at all times.
- Video may last up to 30 seconds maximum.
- Players can submit multiple attempts; the best attempt counts.

Basic reward:
- 50 XP points
- "Keepy-Ups Challenger" badge on profile
- Challenge marked as completed ✅

Scoring:
✅ Successfully completed = challenge finished

Difficulty:
⭐ Beginner

Why it''s good:
- Everyone can participate.
- Quick to record.
- A good first challenge for new users.
- Easy to verify on video.',
  '50 XP points + Keepy-Ups Challenger badge + Challenge marked complete',
  '50 XP points',
  'Keepy-Ups Challenger badge on profile + Challenge marked complete ✅',
  'digital',
  'active'
)
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  instructions = excluded.instructions,
  max_video_duration_seconds = excluded.max_video_duration_seconds,
  equipment = excluded.equipment,
  rules_json = excluded.rules_json,
  scoring = excluded.scoring,
  badge = excluded.badge,
  rules = excluded.rules,
  reward = excluded.reward,
  reward_title = excluded.reward_title,
  reward_detail = excluded.reward_detail,
  reward_type = excluded.reward_type,
  status = excluded.status;
