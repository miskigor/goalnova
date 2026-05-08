-- Ensure challenge-linked notifications column exists (idempotent).
-- Older deployments may have skipped 20260423140000_notifications_challenge_support.sql.

alter table public.notifications
  add column if not exists related_challenge_id uuid references public.challenges (id) on delete set null;

create index if not exists notifications_related_challenge_id_idx
  on public.notifications (related_challenge_id)
  where related_challenge_id is not null;
