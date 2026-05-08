-- One saved analysis per video: re-analyze updates the same row (upsert onConflict=video_id).
-- If `add constraint` fails, dedupe: keep one row per video_id (e.g. latest created_at) then re-run.
alter table public.ai_analyses
  drop constraint if exists ai_analyses_user_video_unique;

alter table public.ai_analyses
  add constraint ai_analyses_video_id_key unique (video_id);
