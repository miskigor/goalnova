-- Auto-approve club membership when player joins with invite code.
-- Paste in Supabase SQL Editor → Run, then refresh profile and enter code again.

create or replace function public.goalnova_club_join(
  p_club_id uuid default null,
  p_club_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_club public.clubs%rowtype;
  v_code text := upper(trim(coalesce(p_club_code, '')));
  v_membership_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_club_id is not null then
    select * into v_club from public.clubs where id = p_club_id;
  elsif v_code <> '' then
    select * into v_club from public.clubs where club_code = v_code;
  else
    raise exception 'club_id or club_code required';
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'club_not_found');
  end if;

  if exists (
    select 1 from public.club_memberships cm
    where cm.user_id = v_uid and cm.status in ('pending', 'approved')
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_member');
  end if;

  insert into public.club_memberships (club_id, user_id, status, joined_via_code)
  values (
    v_club.id,
    v_uid,
    case when v_code <> '' then 'approved'::public.club_membership_status else 'pending'::public.club_membership_status end,
    nullif(v_code, '')
  )
  on conflict (club_id, user_id) do update
  set
    status = case when v_code <> '' then 'approved'::public.club_membership_status else excluded.status end,
    joined_via_code = coalesce(excluded.joined_via_code, club_memberships.joined_via_code),
    updated_at = now()
  returning id into v_membership_id;

  if v_code <> '' then
    perform public.goalnova_club_sync_member_premium(v_uid);
    perform public.goalnova_club_refresh_stats(v_club.id);
    perform public.goalnova_club_try_activate_partnership(v_club.id);
  end if;

  return jsonb_build_object(
    'ok', true,
    'membership_id', v_membership_id,
    'club_id', v_club.id,
    'club_name', v_club.name,
    'status', case when v_code <> '' then 'approved' else 'pending' end
  );
end;
$$;
