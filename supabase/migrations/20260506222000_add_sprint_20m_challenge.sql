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
  'sprint-20m-challenge',
  'Sprint 20m Challenge',
  'Show your speed, explosiveness, and sprint technique by running 20 meters as fast as possible.',
  'Mark a 20-meter distance with a start and finish line. Start behind the line and sprint to the finish as fast as possible. Record the full attempt from start to finish.',
  15,
  '["2 cones","phone camera","stopwatch","20 meter space"]'::jsonb,
  '["The player must start behind the start line","The sprint distance must be exactly 20 meters","The full attempt must be visible in the video","Time is measured from the first movement to crossing the finish line","Flying start is not allowed","Edited or cut videos are not allowed","Maximum video length is 15 seconds"]'::jsonb,
  '{"sprint_time":60,"start_explosiveness":20,"running_technique":10,"execution_validity":10}'::jsonb,
  'Speedster',
  'Instructions:
- Mark a 20-meter distance with a start and finish line.
- Start behind the line and sprint to the finish as fast as possible.
- Record the full attempt from start to finish.

Equipment:
- 2 cones
- phone camera
- stopwatch
- 20 meter space

Rules:
- The player must start behind the start line.
- The sprint distance must be exactly 20 meters.
- The full attempt must be visible in the video.
- Time is measured from the first movement to crossing the finish line.
- Flying start is not allowed.
- Edited or cut videos are not allowed.
- Maximum video length is 15 seconds.

Scoring:
- Sprint time: 60
- Start explosiveness: 20
- Running technique: 10
- Execution validity: 10

Attempts:
- Free player: 1 attempt
- Premium player: multiple attempts, can choose best attempt, better visibility to scouts',
  'Speedster badge',
  'Speedster',
  'Badge for top Sprint 20m performers',
  'recognition',
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

