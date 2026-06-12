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
  'crossbar-challenge',
  'Crossbar Challenge',
  'Take 10 shots from a fixed distance and try to hit the crossbar. This challenge tests shooting accuracy, technique, control, and composure.',
  'From 16 meters (penalty area line), take 10 shots with a stationary ball. Hit the crossbar as many times as possible. Record all attempts in one continuous video with the goal and crossbar clearly visible.',
  90,
  '["football","standard goal","phone camera","16 meter shooting distance"]'::jsonb,
  '[
    "Use a standard football goal if available",
    "Take 10 shot attempts",
    "Recommended distance: 16 meters / edge of the penalty area",
    "The ball must be stationary before each shot",
    "The crossbar hit must be clearly visible",
    "The player, ball, goal, and crossbar must be visible in the video",
    "The video must show all 10 attempts",
    "The video must be one continuous recording",
    "No cuts, edits, or speed changes",
    "Shots that hit the posts do not count",
    "Only direct crossbar hits count"
  ]'::jsonb,
  '{"crossbar_hits":10}'::jsonb,
  'Crossbar King',
  'Goal:
Hit the crossbar as many times as possible from a fixed distance.

Category:
Shooting / Accuracy

Difficulty:
⭐⭐ Intermediate

Challenge:
Take 10 shots from a fixed distance and try to hit the crossbar.

Rules:
- Use a standard football goal if available.
- Take 10 shot attempts.
- Recommended distance: 16 meters / edge of the penalty area.
- The ball must be stationary before each shot.
- The crossbar hit must be clearly visible.
- The player, ball, goal, and crossbar must be visible in the video.
- The video must show all 10 attempts.
- The video must be one continuous recording.
- No cuts, edits, or speed changes.
- Shots that hit the posts do not count.
- Only direct crossbar hits count.

Scoring:
Primary metric: Number of successful crossbar hits out of 10.

Ranking tiers:
- 5/10 or more = Elite
- 4/10 = Gold
- 3/10 = Silver
- 2/10 = Bronze
- 1/10 = Completed
- 0/10 = Attempt submitted, but not completed

Leaderboard:
- Rank by highest number of crossbar hits.
- If tied, rank by earliest valid submission.

Upload requirements:
- Full body visible.
- Ball visible.
- Goal and crossbar visible.
- All 10 attempts visible.
- One continuous video.
- No edits.

Reward:
- Challenge completed status ✅
- Tiered XP: 1 hit = 50 XP · 2 = 75 XP · 3 = 100 XP · 4 = 125 XP · 5+ = 150 XP
- Leaderboard position
- Eligible to be featured on PitchRusch social media
- Crossbar King badge on profile',
  'Up to 150 XP points + Crossbar King badge + Challenge completed + Leaderboard position',
  'Up to 150 XP points',
  '1 hit = 50 XP · 2 = 75 XP · 3 = 100 XP · 4 = 125 XP · 5+ = 150 XP · Crossbar King badge on profile + Challenge completed ✅ + Leaderboard position + Social media feature eligibility',
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
