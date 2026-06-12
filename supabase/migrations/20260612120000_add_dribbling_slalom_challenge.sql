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
  'dribbling-slalom-challenge',
  'Dribbling Slalom Challenge',
  'Dribble through 5 cones as fast as possible while keeping full control of the ball.',
  'Set up 5 cones in a straight line, about 2 meters apart. Start behind the start line, dribble through every cone, and finish past the last cone. Record one continuous attempt with your full body and the full course visible.',
  30,
  '["5 cones","football","phone camera","~10 meter flat space"]'::jsonb,
  '[
    "Use 5 cones or markers in a straight line",
    "Distance between cones: approximately 2 meters",
    "Start behind the start line",
    "Dribble through all 5 cones",
    "The ball must remain under control",
    "One continuous video — no cuts, edits or speed adjustments",
    "The full course must be visible",
    "Missing a cone = invalid attempt",
    "Knocking over a cone = +1 second penalty"
  ]'::jsonb,
  '{"slalom_time_seconds":100}'::jsonb,
  'Slalom Ace',
  'Goal:
Complete a slalom course with the ball as quickly as possible while maintaining control.

Category:
Dribbling

Difficulty:
⭐⭐ Intermediate

Course layout:
START → Cone 1 → Cone 2 → Cone 3 → Cone 4 → Cone 5 → FINISH

Rules:
- Use 5 cones or markers.
- Distance between cones: approximately 2 meters.
- Start behind the start line.
- Dribble through all 5 cones.
- The ball must remain under control.
- The entire attempt must be recorded in one continuous video.
- No video cuts, edits or speed adjustments.
- The full course must be visible.
- Missing a cone results in disqualification.
- Knocking over a cone adds a 1 second penalty.

Scoring:
- Primary metric: Fastest valid time wins (seconds).
- Knocked cone = +1 second penalty added to time.
- Missed cone = invalid attempt (not ranked).

Leaderboard example:
- Player A: 8.42s
- Player B: 7.91s ← ranks higher
- Player C: 8.65s

Upload requirements:
- Full body visible.
- Full course visible.
- One continuous recording.
- No edits.
- Valid completion of all cones.

Reward:
- Challenge completed status ✅
- 50 XP points
- Leaderboard position
- Eligible for PitchRusch featured player selection
- Slalom Ace badge on profile',
  '50 XP points + Slalom Ace badge + Challenge completed + Leaderboard position',
  '50 XP points',
  'Slalom Ace badge on profile + Challenge completed ✅ + Leaderboard position + Featured player eligibility',
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
