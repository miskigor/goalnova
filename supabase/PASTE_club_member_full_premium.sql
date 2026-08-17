-- Approved club members get full Player Premium for as long as they stay in the club.
-- Paste in Supabase SQL Editor → Run.
-- Does not change Stripe-paid subscriptions.

create or replace function public.goalnova_club_sync_member_premium(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club record;
  v_membership record;
  v_now timestamptz := now();
  v_end timestamptz;
begin
  select cm.*, c.partnership_status, c.verified_partner, c.premium_grace_until
  into v_membership
  from public.club_memberships cm
  inner join public.clubs c on c.id = cm.club_id
  where cm.user_id = p_user_id
    and cm.status = 'approved'
  order by cm.created_at desc
  limit 1;

  if not found then
    update public.player_profiles pp
    set club_id = null, club_verified = false
    where pp.id = p_user_id;

    if exists (
      select 1 from public.player_profiles pp
      where pp.id = p_user_id
        and pp.club_premium_club_id is not null
        and coalesce(nullif(trim(pp.stripe_subscription_id), ''), '') = ''
    ) then
      perform set_config('app.goalnova_bypass_subscription_guard', 'on', true);
      update public.player_profiles pp
      set
        subscription_plan = 'free',
        subscription_status = 'inactive',
        subscription_current_period_end = null,
        club_premium_club_id = null
      where pp.id = p_user_id
        and pp.club_premium_club_id is not null
        and coalesce(nullif(trim(pp.stripe_subscription_id), ''), '') = '';

      update public.users u
      set subscription_plan = 'free', subscription_status = 'inactive',
          subscription_current_period_end = null, is_premium = false
      where u.id = p_user_id
        and coalesce(nullif(trim(u.stripe_subscription_id), ''), '') = '';
    end if;
    return;
  end if;

  select * into v_club from public.clubs where id = v_membership.club_id;

  update public.player_profiles pp
  set
    club_id = v_membership.club_id,
    club_verified = (
      v_club.partnership_status = 'active'
      and v_club.verified_partner = true
    )
  where pp.id = p_user_id;

  -- Any approved member gets full Player Premium until they leave the club.
  perform set_config('app.goalnova_bypass_subscription_guard', 'on', true);
  v_end := v_now + interval '10 years';
  update public.player_profiles pp
  set
    subscription_plan = 'player_premium',
    subscription_status = 'active',
    subscription_current_period_end = v_end,
    club_premium_club_id = v_club.id
  where pp.id = p_user_id
    and coalesce(nullif(trim(pp.stripe_subscription_id), ''), '') = '';

  update public.users u
  set
    subscription_plan = 'player_premium',
    subscription_status = 'active',
    subscription_current_period_end = v_end,
    is_premium = true
  where u.id = p_user_id
    and coalesce(nullif(trim(u.stripe_subscription_id), ''), '') = '';
end;
$$;

do $$
declare
  v_user uuid;
begin
  for v_user in
    select distinct cm.user_id
    from public.club_memberships cm
    where cm.status = 'approved'
  loop
    perform public.goalnova_club_sync_member_premium(v_user);
  end loop;
end;
$$;
