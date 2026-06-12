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
  'freestyle-challenge',
  'Freestyle Challenge',
  'Record a freestyle football routine and show your most impressive tricks, ball control, creativity, and technical ability. This challenge is designed for players who want to showcase their flair and individual skills.',
  'Record your best freestyle football routine in one continuous video (15–60 seconds). Show your tricks, ball control, and creativity with you and the ball clearly visible.',
  60,
  '["football","phone camera","open space"]'::jsonb,
  '[
    "Video length: 15–60 seconds",
    "Use a football",
    "The player must remain visible throughout the attempt",
    "The ball must remain visible for most of the routine",
    "Freestyle tricks, juggling combinations, around-the-worlds, stalls, transitions, and creative skills are allowed",
    "No dangerous or unsafe tricks",
    "No AI-generated content",
    "The video must represent the player''s real abilities",
    "No excessive editing that changes the actual performance",
    "Music and visual effects are allowed if they do not hide the performance"
  ]'::jsonb,
  '{"community_engagement":100}'::jsonb,
  'Freestyle King',
  'Goal:
Show your best football freestyle skills, creativity, control, and technique.

Category:
Freestyle / Skill

Difficulty:
⭐⭐⭐ Advanced

Challenge:
Record a freestyle football routine and showcase your most impressive individual skills.

Rules:
- Video length: 15–60 seconds.
- Use a football.
- The player must remain visible throughout the attempt.
- The ball must remain visible for most of the routine.
- Freestyle tricks, juggling combinations, around-the-worlds, stalls, transitions, and creative skills are allowed.
- No dangerous or unsafe tricks.
- No AI-generated content.
- The video must represent the player''s real abilities.
- No excessive editing that changes the actual performance.
- Music and visual effects are allowed if they do not hide the performance.

Scoring:
This challenge is judged by community engagement and AI-assisted performance signals.

Evaluation criteria:
- Creativity
- Ball control
- Difficulty
- Technique
- Style

Ranking levels (community leaderboard):
- Bronze · Silver · Gold · Elite — based on competition ranking

Leaderboard:
- Ranked by competition score (AI + community likes).
- Higher engagement and stronger performance rank higher.

Completion:
Any valid freestyle submission completes the challenge.

Upload requirements:
- Full body visible.
- Ball visible.
- 15–60 second video.
- Real football freestyle content.
- No misleading edits.

Reward:
- Challenge completed status ✅
- 75 XP points on valid submission
- Leaderboard position
- Eligible for PitchRusch Featured Player selection
- Eligible for Skill of the Week selection
- Top weekly performers may earn bonus XP when supported
- Freestyle King badge on profile',
  '75 XP points + Freestyle King badge + Challenge completed + Leaderboard position',
  '75 XP points',
  '75 XP on valid submission · Freestyle King badge on profile + Challenge completed ✅ + Leaderboard position + Featured Player & Skill of the Week eligibility',
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
