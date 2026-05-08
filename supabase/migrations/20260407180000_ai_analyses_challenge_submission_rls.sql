-- Allow challenge submitters (video owner + challenge-linked clip) to persist AI analysis
-- without premium. Premium policies remain for other videos.

create policy "ai_analyses_insert_challenge_submission"
  on public.ai_analyses
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.videos v
      where v.id = ai_analyses.video_id
        and v.user_id = auth.uid()
        and v.challenge_id is not null
    )
  );

create policy "ai_analyses_update_challenge_submission"
  on public.ai_analyses
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.videos v
      where v.id = ai_analyses.video_id
        and v.user_id = auth.uid()
        and v.challenge_id is not null
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.videos v
      where v.id = ai_analyses.video_id
        and v.user_id = auth.uid()
        and v.challenge_id is not null
    )
  );
