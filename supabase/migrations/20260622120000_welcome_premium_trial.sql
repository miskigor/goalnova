-- Welcome premium: every new player/scout profile gets 30 days of premium on signup.
-- Existing free accounts (no Stripe sub) are backfilled once.

create or replace function public.goalnova_grant_welcome_premium_trial(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_plan text;
  v_now timestamptz := now();
  v_end timestamptz := v_now + interval '30 days';
  v_stripe_sub text;
  v_has_active boolean := false;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_user');
  end if;

  select coalesce(nullif(trim(u.role), ''), 'player'),
         coalesce(nullif(trim(u.stripe_subscription_id), ''), '')
  into v_role, v_stripe_sub
  from public.users u
  where u.id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'user_not_found');
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

  perform set_config('app.goalnova_bypass_subscription_guard', '', true);

  return jsonb_build_object('ok', true, 'plan', v_plan, 'ends_at', v_end);
exception
  when others then
    perform set_config('app.goalnova_bypass_subscription_guard', '', true);
    raise;
end;
$$;

grant execute on function public.goalnova_grant_welcome_premium_trial(uuid) to authenticated;

create or replace function public.goalnova_trg_grant_welcome_premium_trial_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.goalnova_grant_welcome_premium_trial(new.id);
  return new;
end;
$$;

drop trigger if exists trg_player_profiles_welcome_premium_trial on public.player_profiles;
create trigger trg_player_profiles_welcome_premium_trial
after insert on public.player_profiles
for each row
execute function public.goalnova_trg_grant_welcome_premium_trial_after_insert();

drop trigger if exists trg_scout_profiles_welcome_premium_trial on public.scout_profiles;
create trigger trg_scout_profiles_welcome_premium_trial
after insert on public.scout_profiles
for each row
execute function public.goalnova_trg_grant_welcome_premium_trial_after_insert();

-- One-time backfill for existing free accounts (no Stripe subscription).
do $$
declare
  r record;
begin
  for r in
    select u.id
    from public.users u
    where u.role in ('player', 'scout')
      and coalesce(nullif(trim(u.stripe_subscription_id), ''), '') = ''
  loop
    perform public.goalnova_grant_welcome_premium_trial(r.id);
  end loop;
end $$;
