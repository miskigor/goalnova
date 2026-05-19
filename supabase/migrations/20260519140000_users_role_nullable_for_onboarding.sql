-- Role is chosen on /role; do not default new accounts to player.
alter table public.users
  alter column role drop default;

alter table public.users
  alter column role drop not null;

comment on column public.users.role is
  'App role: player | scout. NULL until the user completes /role onboarding.';
