-- Admin premium grant: 30 days player_premium / scout_pro on profile + users (not just is_premium).

create or replace function public.goalnova_admin_set_premium(
  p_user_id uuid,
  p_premium boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_role text;
  v_now timestamptz := now();
  v_new_end timestamptz;
  v_plan text;
  v_granted boolean := coalesce(p_premium, false);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff <> 'super_admin' then
    raise exception 'Forbidden';
  end if;

  select coalesce(nullif(trim(role), ''), 'player')
  into v_role
  from public.users
  where id = p_user_id;

  if not found then
    raise exception 'User not found';
  end if;

  insert into public.player_profiles (id)
  values (p_user_id)
  on conflict (id) do nothing;

  perform set_config('app.goalnova_bypass_subscription_guard', 'on', true);

  if v_granted then
    v_plan := case when v_role = 'scout' then 'scout_pro' else 'player_premium' end;

    if v_role = 'scout' then
      insert into public.scout_profiles (id)
      values (p_user_id)
      on conflict (id) do nothing;

      select coalesce(
        greatest(coalesce(sp.subscription_current_period_end, v_now), v_now) + interval '30 days',
        v_now + interval '30 days'
      )
      into v_new_end
      from public.scout_profiles sp
      where sp.id = p_user_id;
    else
      select coalesce(
        greatest(coalesce(pp.subscription_current_period_end, v_now), v_now) + interval '30 days',
        v_now + interval '30 days'
      )
      into v_new_end
      from public.player_profiles pp
      where pp.id = p_user_id;
    end if;

    if v_new_end is null then
      v_new_end := v_now + interval '30 days';
    end if;

    if v_role = 'scout' then
      update public.scout_profiles sp
      set
        subscription_plan = v_plan,
        subscription_status = 'active',
        subscription_current_period_end = v_new_end
      where sp.id = p_user_id;
    else
      update public.player_profiles pp
      set
        subscription_plan = 'player_premium',
        subscription_status = 'active',
        subscription_current_period_end = v_new_end
      where pp.id = p_user_id;
    end if;

    update public.users u
    set
      subscription_plan = v_plan,
      subscription_status = 'active',
      subscription_current_period_end = v_new_end,
      is_premium = true
    where u.id = p_user_id;
  else
    v_plan := 'free';
    v_new_end := null;

    if v_role = 'scout' then
      update public.scout_profiles sp
      set
        subscription_plan = 'free',
        subscription_status = 'inactive',
        subscription_current_period_end = null
      where sp.id = p_user_id
        and coalesce(nullif(trim(sp.stripe_subscription_id), ''), '') = '';

      update public.users u
      set
        subscription_plan = 'free',
        subscription_status = 'inactive',
        subscription_current_period_end = null,
        is_premium = false
      where u.id = p_user_id
        and coalesce(nullif(trim(u.stripe_subscription_id), ''), '') = '';
    else
      update public.player_profiles pp
      set
        subscription_plan = 'free',
        subscription_status = 'inactive',
        subscription_current_period_end = null
      where pp.id = p_user_id
        and coalesce(nullif(trim(pp.stripe_subscription_id), ''), '') = '';

      update public.users u
      set
        subscription_plan = 'free',
        subscription_status = 'inactive',
        subscription_current_period_end = null,
        is_premium = false
      where u.id = p_user_id
        and coalesce(nullif(trim(u.stripe_subscription_id), ''), '') = '';
    end if;
  end if;

  perform set_config('app.goalnova_bypass_subscription_guard', '', true);

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'set_premium',
    jsonb_build_object(
      'is_premium', v_granted,
      'subscription_plan', v_plan,
      'subscription_current_period_end', v_new_end
    )
  );

  return jsonb_build_object(
    'ok', true,
    'is_premium', v_granted,
    'subscription_plan', v_plan,
    'subscription_current_period_end', v_new_end
  );
exception
  when others then
    perform set_config('app.goalnova_bypass_subscription_guard', '', true);
    raise;
end;
$$;

grant execute on function public.goalnova_admin_set_premium(uuid, boolean) to authenticated;
