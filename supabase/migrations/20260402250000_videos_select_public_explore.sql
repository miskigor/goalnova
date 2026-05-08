-- Public read of videos for /explore and anonymous global feeds.
-- Existing "videos_select_own" still applies to authenticated users (OR semantics).
-- Anon can only satisfy this policy, so guests see all rows matching the predicate.

drop policy if exists "videos_select_explore_public" on public.videos;
create policy "videos_select_explore_public"
  on public.videos
  for select
  to anon, authenticated
  using (
    video_url is not null
    and length(trim(video_url)) > 0
  );

grant select on table public.videos to anon;

-- Like counts on explore (anon-friendly; no PII in likes row).
grant select on table public.likes to anon;

-- Player display names on cards (adjust if you enable RLS on player_profiles without a public SELECT policy).
grant select on table public.player_profiles to anon;
