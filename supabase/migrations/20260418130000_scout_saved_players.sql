-- Shortlist: verified scouts save player user ids they track.

create table if not exists public.scout_saved_players (
  scout_user_id uuid not null references public.users (id) on delete cascade,
  player_user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (scout_user_id, player_user_id),
  constraint scout_saved_players_no_self check (scout_user_id <> player_user_id)
);

create index if not exists scout_saved_players_player_idx
  on public.scout_saved_players (player_user_id);

comment on table public.scout_saved_players is 'Approved scouts bookmark player profiles (shortlist).';

alter table public.scout_saved_players enable row level security;

create policy "scout_saved_players_select_own"
  on public.scout_saved_players
  for select
  to authenticated
  using (scout_user_id = auth.uid());

create policy "scout_saved_players_insert_approved"
  on public.scout_saved_players
  for insert
  to authenticated
  with check (
    scout_user_id = auth.uid()
    and scout_user_id <> player_user_id
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'scout'
        and u.scout_verification_status = 'approved'
    )
    and exists (
      select 1 from public.player_profiles pp where pp.id = player_user_id
    )
  );

create policy "scout_saved_players_delete_own"
  on public.scout_saved_players
  for delete
  to authenticated
  using (scout_user_id = auth.uid());

grant select, insert, delete on table public.scout_saved_players to authenticated;
