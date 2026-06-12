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
  'weak-foot-pass-challenge',
  'Weak Foot Pass Challenge',
  'Set up a target on a wall, fence, small goal, or marked area. Complete 10 controlled passes using only your weaker foot. The more accurate passes you complete, the higher you rank.',
  'Mark a clear target on a wall, fence, small goal, or flat surface. Complete 10 controlled passes using only your weaker foot in one continuous video.',
  60,
  '["football","wall/fence/small goal or marked target","phone camera","~5–10 meter flat space"]'::jsonb,
  '[
    "Use only your weaker foot",
    "Complete 10 pass attempts",
    "Passes must be controlled, not shots",
    "The target must be clearly visible",
    "The player and ball must be visible",
    "The video must show all 10 attempts",
    "The video must be one continuous recording",
    "No cuts, edits, or speed changes",
    "If the player uses the stronger foot, the attempt is invalid"
  ]'::jsonb,
  '{"successful_pass_hits":10}'::jsonb,
  'Off-Foot Ace',
  'Goal:
Show accuracy and control using your weaker foot.

Category:
Passing / Technique

Difficulty:
⭐ Beginner

Challenge:
Set up a target on a wall, fence, small goal, or marked area. Complete 10 controlled passes using only your weaker foot. The more accurate passes you complete, the higher you rank.

Rules:
- Use only your weaker foot.
- Complete 10 pass attempts.
- Passes must be controlled, not shots.
- The target must be clearly visible.
- The player and ball must be visible.
- The video must show all 10 attempts.
- The video must be one continuous recording.
- No cuts, edits, or speed changes.
- If the player uses the stronger foot, the attempt is invalid.

Scoring:
Primary metric: Number of successful target hits out of 10.

Ranking tiers:
- 10/10 = Elite
- 9/10 = Gold
- 8/10 = Silver
- 7/10 = Bronze
- Below 7/10 = Completed only

Leaderboard:
- Rank by highest score (hits out of 10).
- If tied, rank by earliest valid submission.

Upload requirements:
- Full body visible.
- Target visible.
- All 10 attempts visible.
- One continuous video.
- No edits.

Reward:
- Challenge completed status ✅
- 50 XP points on valid completion
- 100 XP points for a perfect 10/10
- Leaderboard position
- Eligible to be featured on PitchRusch social media
- Off-Foot Ace badge on profile',
  'Up to 100 XP points + Off-Foot Ace badge + Challenge completed + Leaderboard position',
  'Up to 100 XP points',
  '50 XP on valid completion · 100 XP for 10/10 · Off-Foot Ace badge on profile + Challenge completed ✅ + Leaderboard position + Social media feature eligibility',
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
