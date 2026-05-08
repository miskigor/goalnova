-- Ensure per-user soft delete columns exist (idempotent for DBs that skipped earlier migrations).

alter table public.messages
  add column if not exists deleted_for_sender boolean not null default false,
  add column if not exists deleted_for_recipient boolean not null default false;
