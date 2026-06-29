-- Paste in Supabase SQL Editor (requires club partnership migration).

-- Club logo upload: contact person (contact_email) + club admins can set clubs.logo_url.

create or replace function public.goalnova_club_user_can_manage(
  p_club_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_club public.clubs%rowtype;
  v_email text;
begin
  if p_user_id is null then
    return false;
  end if;

  if public.goalnova_staff_effective_role() is not null then
    return true;
  end if;

  select * into v_club from public.clubs where id = p_club_id;
  if not found then
    return false;
  end if;

  if v_club.coach_user_id = p_user_id then
    return true;
  end if;

  if exists (
    select 1
    from public.club_memberships cm
    where cm.club_id = p_club_id
      and cm.user_id = p_user_id
      and cm.status = 'approved'
      and cm.is_admin = true
  ) then
    return true;
  end if;

  select lower(trim(u.email)) into v_email
  from public.users u
  where u.id = p_user_id;

  if v_email is not null
     and v_club.contact_email is not null
     and v_email = lower(trim(v_club.contact_email)) then
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.goalnova_club_user_can_manage(uuid, uuid) from public;
grant execute on function public.goalnova_club_user_can_manage(uuid, uuid) to authenticated;

create or replace function public.goalnova_club_update_logo(
  p_club_id uuid,
  p_logo_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_logo text := nullif(trim(coalesce(p_logo_url, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.goalnova_club_user_can_manage(p_club_id) then
    raise exception 'Forbidden';
  end if;

  if not exists (select 1 from public.clubs c where c.id = p_club_id) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  update public.clubs
  set logo_url = v_logo, updated_at = now()
  where id = p_club_id;

  return jsonb_build_object('ok', true, 'logo_url', v_logo);
end;
$$;

revoke all on function public.goalnova_club_update_logo(uuid, text) from public;
grant execute on function public.goalnova_club_update_logo(uuid, text) to authenticated;

-- Auto-grant club admin to contact person when they join with invite code.
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
  v_user_email text;
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

  select lower(trim(u.email)) into v_user_email
  from public.users u
  where u.id = v_uid;

  if v_user_email is not null
     and v_club.contact_email is not null
     and v_user_email = lower(trim(v_club.contact_email)) then
    update public.club_memberships
    set is_admin = true, updated_at = now()
    where id = v_membership_id;

    update public.clubs
    set coach_user_id = coalesce(coach_user_id, v_uid), updated_at = now()
    where id = v_club.id;
  end if;

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

create or replace function public.goalnova_club_dashboard(p_club_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_club public.clubs%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_club from public.clubs where id = p_club_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  if not public.goalnova_club_user_can_manage(p_club_id, v_uid) then
    raise exception 'Forbidden';
  end if;

  perform public.goalnova_club_refresh_stats(p_club_id);
  select * into v_club from public.clubs where id = p_club_id;

  return jsonb_build_object(
    'ok', true,
    'club', row_to_json(v_club),
    'pending', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membership_id', cm.id,
        'user_id', cm.user_id,
        'display_name', coalesce(nullif(trim(pp.full_name), ''), nullif(trim(pp.username), ''), 'Player'),
        'username', coalesce(nullif(trim(pp.username), ''), ''),
        'country', nullif(trim(pp.country), ''),
        'avatar_url', nullif(trim(u.avatar_url), ''),
        'created_at', cm.created_at
      ) order by cm.created_at asc)
      from public.club_memberships cm
      inner join public.player_profiles pp on pp.id = cm.user_id
      inner join public.users u on u.id = cm.user_id
      where cm.club_id = p_club_id and cm.status = 'pending'
    ), '[]'::jsonb),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membership_id', cm.id,
        'user_id', cm.user_id,
        'display_name', coalesce(nullif(trim(pp.full_name), ''), nullif(trim(pp.username), ''), 'Player'),
        'username', coalesce(nullif(trim(pp.username), ''), ''),
        'country', nullif(trim(pp.country), ''),
        'avatar_url', nullif(trim(u.avatar_url), ''),
        'xp', public.goalnova_club_member_xp(cm.user_id),
        'videos', public.goalnova_club_member_video_count(cm.user_id),
        'is_admin', cm.is_admin,
        'created_at', cm.created_at
      ) order by public.goalnova_club_member_xp(cm.user_id) desc)
      from public.club_memberships cm
      inner join public.player_profiles pp on pp.id = cm.user_id
      inner join public.users u on u.id = cm.user_id
      where cm.club_id = p_club_id and cm.status = 'approved'
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.goalnova_club_review_membership(
  p_membership_id uuid,
  p_approve boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.club_memberships%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_row from public.club_memberships where id = p_membership_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  if not public.goalnova_club_user_can_manage(v_row.club_id, v_uid) then
    raise exception 'Forbidden';
  end if;

  update public.club_memberships
  set
    status = case when p_approve then 'approved'::public.club_membership_status else 'rejected'::public.club_membership_status end,
    reviewed_at = now(),
    reviewed_by = v_uid,
    updated_at = now()
  where id = p_membership_id;

  if p_approve then
    perform public.goalnova_club_sync_member_premium(v_row.user_id);
  else
    perform public.goalnova_club_sync_member_premium(v_row.user_id);
  end if;

  perform public.goalnova_club_refresh_stats(v_row.club_id);
  perform public.goalnova_club_try_activate_partnership(v_row.club_id);
  perform public.goalnova_clubs_refresh_all_ranks();

  return jsonb_build_object('ok', true, 'status', case when p_approve then 'approved' else 'rejected' end);
end;
$$;

create or replace function public.goalnova_club_accept_partnership_agreement(p_club_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  if not public.goalnova_club_user_can_manage(p_club_id, v_uid) then
    raise exception 'Forbidden';
  end if;

  update public.clubs
  set partnership_agreement_accepted_at = now(), updated_at = now()
  where id = p_club_id;

  return public.goalnova_club_try_activate_partnership(p_club_id);
end;
$$;

-- Storage bucket for club logos (public read).
alter table if exists storage.objects enable row level security;

insert into storage.buckets (id, name, public)
values ('club-logos', 'club-logos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "club_logos_public_read" on storage.objects;
drop policy if exists "club_logos_insert_manage" on storage.objects;
drop policy if exists "club_logos_update_manage" on storage.objects;
drop policy if exists "club_logos_delete_manage" on storage.objects;

create policy "club_logos_public_read"
on storage.objects
for select
using (bucket_id = 'club-logos');

create policy "club_logos_insert_manage"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'club-logos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.goalnova_club_user_can_manage(split_part(name, '/', 1)::uuid)
);

create policy "club_logos_update_manage"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'club-logos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.goalnova_club_user_can_manage(split_part(name, '/', 1)::uuid)
)
with check (
  bucket_id = 'club-logos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.goalnova_club_user_can_manage(split_part(name, '/', 1)::uuid)
);

create policy "club_logos_delete_manage"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'club-logos'
  and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.goalnova_club_user_can_manage(split_part(name, '/', 1)::uuid)
);
