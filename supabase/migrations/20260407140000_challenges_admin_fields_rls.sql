-- Admin-managed challenge fields + staff-only write + public read excludes drafts.

alter table public.challenges
  add column if not exists rules text,
  add column if not exists reward text,
  add column if not exists expires_at timestamptz,
  add column if not exists status text not null default 'active'
    check (status in ('draft', 'active', 'ended'));

comment on column public.challenges.rules is 'Optional rules / how to participate.';
comment on column public.challenges.reward is 'Optional reward description for marketing.';
comment on column public.challenges.expires_at is 'When the challenge stops accepting emphasis in UI (nullable).';
comment on column public.challenges.status is 'draft = staff only; active/ended visible to players (ended = closed).';

drop policy if exists "challenges_select_public" on public.challenges;
create policy "challenges_select_public"
  on public.challenges
  for select
  to anon, authenticated
  using (status in ('active', 'ended'));

drop policy if exists "challenges_select_staff_all" on public.challenges;
create policy "challenges_select_staff_all"
  on public.challenges
  for select
  to authenticated
  using (public.goalnova_staff_effective_role() is not null);

drop policy if exists "challenges_insert_staff" on public.challenges;
create policy "challenges_insert_staff"
  on public.challenges
  for insert
  to authenticated
  with check (public.goalnova_staff_effective_role() is not null);

drop policy if exists "challenges_update_staff" on public.challenges;
create policy "challenges_update_staff"
  on public.challenges
  for update
  to authenticated
  using (public.goalnova_staff_effective_role() is not null)
  with check (public.goalnova_staff_effective_role() is not null);

grant insert, update on table public.challenges to authenticated;
