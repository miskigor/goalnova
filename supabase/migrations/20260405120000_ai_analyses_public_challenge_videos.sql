-- Public read of AI analysis rows for videos that belong to a challenge and have a public clip URL.
-- Enables challenge hub "best AI score" highlights without exposing analyses for non-challenge uploads.
-- Note: full row (including feedback_text) is readable for these rows; narrow later with a view if needed.

drop policy if exists "ai_analyses_select_public_challenge_videos" on public.ai_analyses;
create policy "ai_analyses_select_public_challenge_videos"
  on public.ai_analyses
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.videos v
      where v.id = ai_analyses.video_id
        and v.challenge_id is not null
        and v.video_url is not null
        and length(trim(v.video_url)) > 0
    )
  );

grant select on table public.ai_analyses to anon;
