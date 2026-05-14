-- Player referrals + invite rewards (idempotent, safe re-run)

-- ---------------------------------------------------------------------------
-- 1) Subscription guard: allow SECURITY DEFINER referral grants
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_guard_subscription_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if coalesce(nullif(current_setting('app.goalnova_bypass_subscription_guard', true), ''), '') = 'on' then
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

-- ---------------------------------------------------------------------------
-- 2) player_profiles: referral + featured boost window
-- ---------------------------------------------------------------------------
alter table public.player_profiles
add column if not exists referral_code text null;

alter table public.player_profiles
add column if not exists referred_by uuid null references auth.users (id) on delete set null;

alter table public.player_profiles
add column if not exists featured_player_until timestamptz null;

create unique index if not exists player_profiles_referral_code_uidx
on public.player_profiles (referral_code)
where referral_code is not null;

create index if not exists player_profiles_referred_by_idx
on public.player_profiles (referred_by)
where referred_by is not null;

comment on column public.player_profiles.referral_code is 'Shareable invite code (unique when set).';
comment on column public.player_profiles.referred_by is 'Auth user id of the referrer (set once).';
comment on column public.player_profiles.featured_player_until is 'Referral Featured Player visibility boost until this instant.';

-- ---------------------------------------------------------------------------
-- 3) player_referrals (one completed referral per new account)
-- ---------------------------------------------------------------------------
create table if not exists public.player_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users (id) on delete cascade,
  referred_user_id uuid not null references auth.users (id) on delete cascade,
  referral_code text not null,
  status text not null default 'completed',
  reward_type text null,
  created_at timestamptz not null default now(),
  unique (referred_user_id)
);

create index if not exists player_referrals_referrer_idx
on public.player_referrals (referrer_user_id);

create index if not exists player_referrals_code_idx
on public.player_referrals (referral_code);

alter table public.player_referrals enable row level security;

drop policy if exists "player_referrals_select_own" on public.player_referrals;
create policy "player_referrals_select_own"
on public.player_referrals
for select
to authenticated
using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);

-- ---------------------------------------------------------------------------
-- 4) Idempotent reward grants
-- ---------------------------------------------------------------------------
create table if not exists public.player_referral_reward_grants (
  user_id uuid not null references auth.users (id) on delete cascade,
  reward_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, reward_key)
);

alter table public.player_referral_reward_grants enable row level security;

drop policy if exists "player_referral_reward_grants_select_own" on public.player_referral_reward_grants;
create policy "player_referral_reward_grants_select_own"
on public.player_referral_reward_grants
for select
to authenticated
using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5) Helpers: ensure referral code
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_player_ensure_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing text;
  candidate text;
  attempts int := 0;
  n int := 0;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;

  select pp.referral_code into existing
  from public.player_profiles pp
  join public.users u on u.id = pp.id
  where pp.id = me and u.role = 'player';

  if existing is not null and length(trim(existing)) > 0 then
    return existing;
  end if;

  if not exists (select 1 from public.users u where u.id = me and u.role = 'player') then
    raise exception 'Referral codes are only available for player accounts';
  end if;

  insert into public.player_profiles (id)
  values (me)
  on conflict (id) do nothing;

  loop
    attempts := attempts + 1;
    if attempts > 40 then
      raise exception 'Could not allocate referral code';
    end if;
    candidate := upper(left(replace(gen_random_uuid()::text, '-', ''), 12));
    begin
      update public.player_profiles pp
      set referral_code = candidate
      where pp.id = me
        and pp.referral_code is null;
      get diagnostics n = row_count;
      if n > 0 then
        return candidate;
      end if;
      select pp2.referral_code into existing from public.player_profiles pp2 where pp2.id = me;
      if existing is not null and length(trim(existing)) > 0 then
        return existing;
      end if;
    exception
      when unique_violation then
        null;
    end;
  end loop;
  raise exception 'referral code allocation failed';
end;
$$;

revoke all on function public.goalnova_player_ensure_referral_code() from public;
grant execute on function public.goalnova_player_ensure_referral_code() to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Apply milestone rewards (internal; called after a new referral row)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_player_referral_apply_milestones(p_referrer uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_new_end timestamptz;
  v_stripe_sub text;
  v_now timestamptz := now();
  v_ins int;
  v_ins2 int;
begin
  if p_referrer is null then
    return;
  end if;

  select count(*)::int into v_count
  from public.player_referrals r
  where r.referrer_user_id = p_referrer
    and r.status = 'completed';

  -- Milestone: 3 invites → 1 month Player Premium (skip if paid Stripe sub is active)
  if v_count >= 3 then
    insert into public.player_referral_reward_grants (user_id, reward_key)
    values (p_referrer, 'invite_3_player_premium')
    on conflict (user_id, reward_key) do nothing;
    get diagnostics v_ins = row_count;
    if v_ins > 0 then
      select coalesce(pp.stripe_subscription_id, '') into v_stripe_sub
      from public.player_profiles pp
      where pp.id = p_referrer;

      if v_stripe_sub is null or length(trim(v_stripe_sub)) = 0 then
        select coalesce(
          greatest(coalesce(pp.subscription_current_period_end, v_now), v_now) + interval '30 days',
          v_now + interval '30 days'
        )
        into v_new_end
        from public.player_profiles pp
        where pp.id = p_referrer;

        if v_new_end is null then
          v_new_end := v_now + interval '30 days';
        end if;

        begin
          perform set_config('app.goalnova_bypass_subscription_guard', 'on', true);

          update public.player_profiles pp
          set
            subscription_plan = 'player_premium',
            subscription_status = 'active',
            subscription_current_period_end = v_new_end
          where pp.id = p_referrer;

          update public.users u
          set
            subscription_plan = 'player_premium',
            subscription_status = 'active',
            subscription_current_period_end = v_new_end,
            is_premium = true
          where u.id = p_referrer;

          perform set_config('app.goalnova_bypass_subscription_guard', '', true);
        exception
          when others then
            perform set_config('app.goalnova_bypass_subscription_guard', '', true);
            raise;
        end;
      end if;
    end if;
  end if;

  -- Milestone: 10 invites → Featured Player boost 7 days
  if v_count >= 10 then
    insert into public.player_referral_reward_grants (user_id, reward_key)
    values (p_referrer, 'invite_10_featured_player')
    on conflict (user_id, reward_key) do nothing;
    get diagnostics v_ins2 = row_count;
    if v_ins2 > 0 then
      update public.player_profiles pp
      set featured_player_until = greatest(
        coalesce(pp.featured_player_until, v_now),
        v_now
      ) + interval '7 days'
      where pp.id = p_referrer;
    end if;
  end if;
end;
$$;

revoke all on function public.goalnova_player_referral_apply_milestones(uuid) from public;

-- ---------------------------------------------------------------------------
-- 7) Complete referral for the signed-in referred player
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_player_complete_referral(p_referral_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  code text := upper(trim(coalesce(p_referral_code, '')));
  ref_user uuid;
  role text;
  already uuid;
  inserted int := 0;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  if code is null or length(code) < 4 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  select u.role into role from public.users u where u.id = me;
  if role is distinct from 'player' then
    return jsonb_build_object('ok', false, 'reason', 'not_player_role');
  end if;

  if not exists (select 1 from public.player_profiles pp where pp.id = me) then
    return jsonb_build_object('ok', false, 'reason', 'no_player_profile');
  end if;

  select pp.referred_by into already from public.player_profiles pp where pp.id = me;
  if already is not null then
    return jsonb_build_object('ok', true, 'noop', true, 'reason', 'already_referred');
  end if;

  select pp.id into ref_user
  from public.player_profiles pp
  join public.users u on u.id = pp.id
  where pp.referral_code = code
    and u.role = 'player'
    and pp.id <> me
  limit 1;

  if ref_user is null then
    return jsonb_build_object('ok', false, 'reason', 'unknown_code');
  end if;

  insert into public.player_referrals (
    referrer_user_id,
    referred_user_id,
    referral_code,
    status
  )
  values (ref_user, me, code, 'completed')
  on conflict (referred_user_id) do nothing;
  get diagnostics inserted = row_count;

  if inserted = 0 then
    return jsonb_build_object('ok', true, 'noop', true, 'reason', 'referral_exists');
  end if;

  update public.player_profiles pp
  set referred_by = ref_user
  where pp.id = me
    and pp.referred_by is null;

  perform public.goalnova_player_referral_apply_milestones(ref_user);

  return jsonb_build_object('ok', true, 'referrer_user_id', ref_user);
end;
$$;

revoke all on function public.goalnova_player_complete_referral(text) from public;
grant execute on function public.goalnova_player_complete_referral(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Dashboard payload for Invite friends UI
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_player_referral_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  role text;
  c text;
  cnt int := 0;
  grants text[];
  feat timestamptz;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select u.role into role from public.users u where u.id = me;
  if role is distinct from 'player' then
    return jsonb_build_object('ok', false, 'reason', 'not_player_role');
  end if;

  begin
    c := public.goalnova_player_ensure_referral_code();
  exception
    when others then
      return jsonb_build_object('ok', false, 'reason', 'ensure_code_failed');
  end;

  select pp.referral_code, pp.featured_player_until
  into c, feat
  from public.player_profiles pp
  where pp.id = me;

  select count(*)::int into cnt
  from public.player_referrals r
  where r.referrer_user_id = me
    and r.status = 'completed';

  select coalesce(array_agg(g.reward_key order by g.reward_key), array[]::text[])
  into grants
  from public.player_referral_reward_grants g
  where g.user_id = me;

  return jsonb_build_object(
    'ok', true,
    'referral_code', c,
    'invite_count', cnt,
    'featured_player_until', feat,
    'granted_keys', to_jsonb(coalesce(grants, array[]::text[]))
  );
end;
$$;

revoke all on function public.goalnova_player_referral_dashboard() from public;
grant execute on function public.goalnova_player_referral_dashboard() to authenticated;
