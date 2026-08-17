-- Staff bypass in goalnova_club_user_can_manage must not list every club as "yours".

create or replace function public.goalnova_club_user_is_assigned_manager(
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

  if exists (
    select 1
    from public.club_partnership_requests r
    where r.created_club_id = p_club_id
      and r.applicant_user_id = p_user_id
      and r.status = 'approved'
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

revoke all on function public.goalnova_club_user_is_assigned_manager(uuid, uuid) from public;
grant execute on function public.goalnova_club_user_is_assigned_manager(uuid, uuid) to authenticated;

create or replace function public.goalnova_club_managed_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  return jsonb_build_object(
    'ok', true,
    'clubs', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug,
          'logo_url', c.logo_url,
          'cover_url', c.cover_url,
          'city', c.city,
          'country', c.country,
          'website', c.website,
          'instagram', c.instagram,
          'description', c.description,
          'contact_person', c.contact_person,
          'contact_email', c.contact_email,
          'club_code', c.club_code
        )
        order by c.created_at desc
      )
      from public.clubs c
      where public.goalnova_club_user_is_assigned_manager(c.id, v_uid)
    ), '[]'::jsonb)
  );
end;
$$;
