-- Stripe subscriptions: storage fields + write protection (idempotent)

alter table public.users
add column if not exists stripe_customer_id text null;

alter table public.users
add column if not exists stripe_subscription_id text null;

alter table public.users
add column if not exists subscription_plan text default 'free';

alter table public.users
add column if not exists subscription_status text default 'inactive';

alter table public.users
add column if not exists subscription_current_period_end timestamptz null;

alter table public.player_profiles
add column if not exists stripe_customer_id text null;

alter table public.player_profiles
add column if not exists stripe_subscription_id text null;

alter table public.scout_profiles
add column if not exists stripe_customer_id text null;

alter table public.scout_profiles
add column if not exists stripe_subscription_id text null;

alter table public.scout_profiles
add column if not exists subscription_plan text default 'free';

alter table public.scout_profiles
add column if not exists subscription_status text default 'inactive';

alter table public.scout_profiles
add column if not exists subscription_current_period_end timestamptz null;

create index if not exists users_stripe_customer_id_idx on public.users (stripe_customer_id);
create index if not exists users_subscription_plan_status_idx on public.users (subscription_plan, subscription_status);

create or replace function public.goalnova_guard_subscription_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if coalesce(new.subscription_plan, '') is distinct from coalesce(old.subscription_plan, '')
     or coalesce(new.subscription_status, '') is distinct from coalesce(old.subscription_status, '')
     or coalesce(new.subscription_current_period_end::text, '') is distinct from coalesce(old.subscription_current_period_end::text, '')
     or coalesce(new.stripe_customer_id, '') is distinct from coalesce(old.stripe_customer_id, '')
     or coalesce(new.stripe_subscription_id, '') is distinct from coalesce(old.stripe_subscription_id, '') then
    raise exception 'subscription fields are managed by billing webhooks only';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_subscription_fields_users on public.users;
create trigger trg_guard_subscription_fields_users
before update on public.users
for each row
execute function public.goalnova_guard_subscription_fields();

drop trigger if exists trg_guard_subscription_fields_player_profiles on public.player_profiles;
create trigger trg_guard_subscription_fields_player_profiles
before update on public.player_profiles
for each row
execute function public.goalnova_guard_subscription_fields();

drop trigger if exists trg_guard_subscription_fields_scout_profiles on public.scout_profiles;
create trigger trg_guard_subscription_fields_scout_profiles
before update on public.scout_profiles
for each row
execute function public.goalnova_guard_subscription_fields();

