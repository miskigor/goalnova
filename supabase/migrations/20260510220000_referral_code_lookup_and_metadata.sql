-- Case-insensitive referrer lookup + fallback to signup user_metadata.pending_referral_code

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
  v_joined timestamptz;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  if length(code) < 4 then
    select upper(trim(coalesce(u.raw_user_meta_data->>'pending_referral_code', '')))
    into code
    from auth.users u
    where u.id = me;
  end if;

  if code is null or length(code) < 4 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  select u.created_at into v_joined
  from auth.users u
  where u.id = me;

  if v_joined is null or v_joined < (now() - interval '30 days') then
    return jsonb_build_object('ok', false, 'reason', 'referral_only_for_new_accounts');
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
  where upper(trim(pp.referral_code)) = code
    and u.role = 'player'
    and pp.id <> me
  limit 1;

  if ref_user is null then
    if exists (
      select 1
      from public.player_profiles pp
      join public.users u on u.id = pp.id
      where pp.id = me
        and u.role = 'player'
        and upper(trim(pp.referral_code)) = code
    ) then
      return jsonb_build_object('ok', false, 'reason', 'self_referral');
    end if;
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
