-- Document challenge_entries upsert ↔ constraint alignment for existing databases.
-- Constraint: challenge_entries_video_id_unique (UNIQUE video_id)
-- Client: lib/supabase/challengeEntries.ts → CHALLENGE_ENTRIES_UPSERT_ON_CONFLICT = video_id

comment on constraint challenge_entries_video_id_unique on public.challenge_entries is
  'Supabase/PostgREST upsert onConflict must be video_id (see challengeEntries.ts).';

comment on table public.challenge_entries is
  'Challenge participation: one row per video (unique video_id), aligned with a single videos.challenge_id per video. Client upsert uses onConflict video_id.';
