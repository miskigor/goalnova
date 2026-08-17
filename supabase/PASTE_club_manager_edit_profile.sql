-- Paste in Supabase SQL Editor.
-- Requires goalnova_club_user_can_manage (from PASTE_club_logo_upload.sql).
-- Lets the club manager (coach / contact email / club admin) edit club info from their profile.

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
      where public.goalnova_club_user_can_manage(c.id, v_uid)
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.goalnova_club_managed_list() from public;
grant execute on function public.goalnova_club_managed_list() to authenticated;

create or replace function public.goalnova_club_update_profile(
  p_club_id uuid,
  p_name text,
  p_city text default null,
  p_country text default null,
  p_website text default null,
  p_instagram text default null,
  p_description text default null,
  p_contact_person text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_city text := nullif(trim(coalesce(p_city, '')), '');
  v_country text := nullif(trim(coalesce(p_country, '')), '');
  v_website text := nullif(trim(coalesce(p_website, '')), '');
  v_instagram text := nullif(trim(coalesce(p_instagram, '')), '');
  v_description text := nullif(trim(coalesce(p_description, '')), '');
  v_contact text := nullif(trim(coalesce(p_contact_person, '')), '');
  v_club public.clubs%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not public.goalnova_club_user_can_manage(p_club_id, v_uid) then
    raise exception 'Forbidden';
  end if;

  if v_name is null or char_length(v_name) < 2 then
    return jsonb_build_object('ok', false, 'error', 'name_required');
  end if;

  update public.clubs
  set
    name = left(v_name, 120),
    city = left(v_city, 80),
    country = left(v_country, 80),
    website = left(v_website, 240),
    instagram = left(v_instagram, 80),
    description = left(v_description, 2000),
    contact_person = left(v_contact, 120),
    updated_at = now()
  where id = p_club_id
  returning * into v_club;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'club', jsonb_build_object(
      'id', v_club.id,
      'name', v_club.name,
      'slug', v_club.slug,
      'logo_url', v_club.logo_url,
      'cover_url', v_club.cover_url,
      'city', v_club.city,
      'country', v_club.country,
      'website', v_club.website,
      'instagram', v_club.instagram,
      'description', v_club.description,
      'contact_person', v_club.contact_person,
      'contact_email', v_club.contact_email,
      'club_code', v_club.club_code
    )
  );
end;
$$;

revoke all on function public.goalnova_club_update_profile(uuid, text, text, text, text, text, text, text) from public;
grant execute on function public.goalnova_club_update_profile(uuid, text, text, text, text, text, text, text) to authenticated;
