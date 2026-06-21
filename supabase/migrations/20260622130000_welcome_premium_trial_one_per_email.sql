-- One welcome premium trial per normalized email (survives account deletion / re-signup).

create table if not exists public.welcome_premium_trial_claims (
  email_normalized text primary key,
  first_user_id uuid null,
  first_claimed_at timestamptz not null default now(),
  trial_ends_at timestamptz null,
  source text not null default 'grant'
);

comment on table public.welcome_premium_trial_claims is
  'Tracks emails that already received the 30-day welcome premium trial (one per email).';

alter table public.welcome_premium_trial_claims enable row level security;

revoke all on table public.welcome_premium_trial_claims from public, authenticated, anon;

create or replace function public.goalnova_normalize_email(p_email text)
returns text
language sql
immutable
as $$
  select lower(trim(coalesce(p_email, '')));
$$;

create or replace function public.goalnova_record_welcome_trial_email_claim(
  p_email text,
  p_user_id uuid default null,
  p_trial_ends_at timestamptz default null,
  p_source text default 'grant'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := public.goalnova_normalize_email(p_email);
begin
  if v_email = '' then
    return;
  end if;

  insert into public.welcome_premium_trial_claims (
    email_normalized,
    first_user_id,
    trial_ends_at,
    source
  )
  values (
    v_email,
    p_user_id,
    p_trial_ends_at,
    coalesce(nullif(trim(p_source), ''), 'grant')
  )
  on conflict (email_normalized) do nothing;
end;
$$;

revoke all on function public.goalnova_record_welcome_trial_email_claim(text, uuid, timestamptz, text) from public;
grant execute on function public.goalnova_record_welcome_trial_email_claim(text, uuid, timestamptz, text) to service_role;

create or replace function public.goalnova_record_welcome_trial_email_if_used(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_stripe_sub text;
  v_plan text;
  v_period_end timestamptz;
begin
  if p_user_id is null then
    return;
  end if;

  select
    public.goalnova_normalize_email(u.email),
    coalesce(nullif(trim(u.stripe_subscription_id), ''), ''),
    coalesce(nullif(trim(u.subscription_plan), ''), 'free'),
    u.subscription_current_period_end
  into v_email, v_stripe_sub, v_plan, v_period_end
  from public.users u
  where u.id = p_user_id;

  if v_email = '' then
    return;
  end if;

  -- Paid Stripe subscribers can subscribe again later; do not burn their email slot.
  if v_stripe_sub <> '' then
    return;
  end if;

  if v_plan in ('player_premium', 'scout_pro', 'club') and v_period_end is not null then
    perform public.goalnova_record_welcome_trial_email_claim(
      v_email,
      p_user_id,
      v_period_end,
      'account_delete'
    );
  end if;
end;
$$;

revoke all on function public.goalnova_record_welcome_trial_email_if_used(uuid) from public;
grant execute on function public.goalnova_record_welcome_trial_email_if_used(uuid) to service_role;

create or replace function public.goalnova_grant_welcome_premium_trial(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_plan text;
  v_email text;
  v_now timestamptz := now();
  v_end timestamptz := v_now + interval '30 days';
  v_stripe_sub text;
  v_has_active boolean := false;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_user');
  end if;

  select
    coalesce(nullif(trim(u.role), ''), 'player'),
    coalesce(nullif(trim(u.stripe_subscription_id), ''), ''),
    public.goalnova_normalize_email(u.email)
  into v_role, v_stripe_sub, v_email
  from public.users u
  where u.id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'user_not_found');
  end if;

  if v_email = '' then
    return jsonb_build_object('ok', false, 'reason', 'missing_email');
  end if;

  if exists (
    select 1
    from public.welcome_premium_trial_claims c
    where c.email_normalized = v_email
  ) then
    return jsonb_build_object('ok', false, 'reason', 'trial_already_used');
  end if;

  if v_stripe_sub <> '' then
    return jsonb_build_object('ok', false, 'reason', 'has_stripe_subscription');
  end if;

  v_plan := case when v_role = 'scout' then 'scout_pro' else 'player_premium' end;

  if v_role = 'scout' then
    select exists (
      select 1
      from public.scout_profiles sp
      where sp.id = p_user_id
        and sp.subscription_status = 'active'
        and sp.subscription_plan in ('scout_pro', 'club')
        and sp.subscription_current_period_end is not null
        and sp.subscription_current_period_end > v_now
    )
    into v_has_active;
  else
    select exists (
      select 1
      from public.player_profiles pp
      where pp.id = p_user_id
        and pp.subscription_status = 'active'
        and pp.subscription_plan = 'player_premium'
        and pp.subscription_current_period_end is not null
        and pp.subscription_current_period_end > v_now
    )
    into v_has_active;
  end if;

  if v_has_active then
    return jsonb_build_object('ok', false, 'reason', 'already_active');
  end if;

  perform set_config('app.goalnova_bypass_subscription_guard', 'on', true);

  if v_role = 'scout' then
    insert into public.scout_profiles (id)
    values (p_user_id)
    on conflict (id) do nothing;

    update public.scout_profiles sp
    set
      subscription_plan = v_plan,
      subscription_status = 'active',
      subscription_current_period_end = v_end
    where sp.id = p_user_id
      and coalesce(nullif(trim(sp.stripe_subscription_id), ''), '') = '';
  else
    insert into public.player_profiles (id)
    values (p_user_id)
    on conflict (id) do nothing;

    update public.player_profiles pp
    set
      subscription_plan = 'player_premium',
      subscription_status = 'active',
      subscription_current_period_end = v_end
    where pp.id = p_user_id
      and coalesce(nullif(trim(pp.stripe_subscription_id), ''), '') = '';
  end if;

  update public.users u
  set
    subscription_plan = v_plan,
    subscription_status = 'active',
    subscription_current_period_end = v_end,
    is_premium = true
  where u.id = p_user_id
    and coalesce(nullif(trim(u.stripe_subscription_id), ''), '') = '';

  perform public.goalnova_record_welcome_trial_email_claim(
    v_email,
    p_user_id,
    v_end,
    'grant'
  );

  perform set_config('app.goalnova_bypass_subscription_guard', '', true);

  return jsonb_build_object('ok', true, 'plan', v_plan, 'ends_at', v_end);
exception
  when others then
    perform set_config('app.goalnova_bypass_subscription_guard', '', true);
    raise;
end;
$$;

grant execute on function public.goalnova_grant_welcome_premium_trial(uuid) to authenticated;

-- Backfill: emails that already received welcome-style premium (no Stripe sub).
insert into public.welcome_premium_trial_claims (
  email_normalized,
  first_user_id,
  first_claimed_at,
  trial_ends_at,
  source
)
select
  public.goalnova_normalize_email(u.email),
  u.id,
  coalesce(u.created_at, now()),
  u.subscription_current_period_end,
  'backfill'
from public.users u
where u.role in ('player', 'scout')
  and public.goalnova_normalize_email(u.email) <> ''
  and coalesce(nullif(trim(u.stripe_subscription_id), ''), '') = ''
  and u.subscription_plan in ('player_premium', 'scout_pro', 'club')
  and u.subscription_current_period_end is not null
on conflict (email_normalized) do nothing;
