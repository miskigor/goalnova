-- Rich rewards, official winners, staff delete on challenges.

alter table public.challenges
  add column if not exists reward_title text,
  add column if not exists reward_detail text,
  add column if not exists reward_type text,
  add column if not exists reward_image_url text;

comment on column public.challenges.reward_title is 'Short prize headline for cards and hero UI.';
comment on column public.challenges.reward_detail is 'Longer prize copy; optional if legacy `reward` is used.';
comment on column public.challenges.reward_type is 'Prize category: gear | digital | cash | feature | recognition | other.';
comment on column public.challenges.reward_image_url is 'Optional image URL for reward visuals.';

alter table public.challenges
  drop constraint if exists challenges_reward_type_check;

alter table public.challenges
  add constraint challenges_reward_type_check check (
    reward_type is null
    or reward_type in ('gear', 'digital', 'cash', 'feature', 'recognition', 'other')
  );

update public.challenges
set reward_detail = reward
where coalesce(trim(reward_detail), '') = ''
  and reward is not null
  and trim(reward) <> '';

create table if not exists public.challenge_winners (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  rank int not null,
  placement_source text not null default 'manual',
  created_at timestamptz not null default now(),
  constraint challenge_winners_rank_range check (rank >= 1 and rank <= 10),
  constraint challenge_winners_source_check check (placement_source in ('manual', 'computed')),
  constraint challenge_winners_challenge_rank_unique unique (challenge_id, rank),
  constraint challenge_winners_challenge_video_unique unique (challenge_id, video_id)
);

create index if not exists challenge_winners_challenge_id_idx
  on public.challenge_winners (challenge_id);

comment on table public.challenge_winners is
  'Official podium for a challenge. Manual rows override client-side computed podium when present.';

alter table public.challenge_winners enable row level security;

drop policy if exists "challenge_winners_select" on public.challenge_winners;
create policy "challenge_winners_select"
  on public.challenge_winners
  for select
  to anon, authenticated
  using (
    public.goalnova_staff_effective_role() is not null
    or exists (
      select 1 from public.challenges c
      where c.id = challenge_winners.challenge_id
        and c.status = 'ended'
    )
  );

drop policy if exists "challenge_winners_insert_staff" on public.challenge_winners;
create policy "challenge_winners_insert_staff"
  on public.challenge_winners
  for insert
  to authenticated
  with check (public.goalnova_staff_effective_role() is not null);

drop policy if exists "challenge_winners_update_staff" on public.challenge_winners;
create policy "challenge_winners_update_staff"
  on public.challenge_winners
  for update
  to authenticated
  using (public.goalnova_staff_effective_role() is not null)
  with check (public.goalnova_staff_effective_role() is not null);

drop policy if exists "challenge_winners_delete_staff" on public.challenge_winners;
create policy "challenge_winners_delete_staff"
  on public.challenge_winners
  for delete
  to authenticated
  using (public.goalnova_staff_effective_role() is not null);

grant select on table public.challenge_winners to anon, authenticated;
grant insert, update, delete on table public.challenge_winners to authenticated;

drop policy if exists "challenges_delete_staff" on public.challenges;
create policy "challenges_delete_staff"
  on public.challenges
  for delete
  to authenticated
  using (public.goalnova_staff_effective_role() is not null);

grant delete on table public.challenges to authenticated;
