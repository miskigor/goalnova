-- Public challenges + optional association on videos.

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

comment on table public.challenges is 'Video challenges / hashtag campaigns (hashtag-style label derived from title in app).';

alter table public.videos
  add column if not exists challenge_id uuid references public.challenges (id) on delete set null;

create index if not exists videos_challenge_id_idx on public.videos (challenge_id)
  where challenge_id is not null;

alter table public.challenges enable row level security;

drop policy if exists "challenges_select_public" on public.challenges;
create policy "challenges_select_public"
  on public.challenges
  for select
  to anon, authenticated
  using (true);

grant select on table public.challenges to anon;
grant select on table public.challenges to authenticated;

insert into public.challenges (slug, title, description) values
  ('top-corner-challenge', 'Top Corner Challenge', 'Show your best strikes into the top corner.'),
  ('skills-showcase', 'Skills Showcase', 'Freestyle and technical skills.'),
  ('speed-dribble', 'Speed Dribble', 'Pace, close control, and acceleration.')
on conflict (slug) do nothing;
