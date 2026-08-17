-- Paste in Supabase SQL Editor.
-- Club vs academy: partners choose a type so the badge is "Verified Club" or "Verified Academy".
-- Existing clubs default to club (HNK Fruškogorac is a club, not an academy).

alter table public.clubs
  add column if not exists organization_kind text not null default 'club';

alter table public.club_partnership_requests
  add column if not exists organization_kind text not null default 'club';

update public.clubs
set organization_kind = 'club'
where organization_kind is null or btrim(organization_kind) = '';

update public.club_partnership_requests
set organization_kind = 'club'
where organization_kind is null or btrim(organization_kind) = '';

alter table public.clubs drop constraint if exists clubs_organization_kind_check;
alter table public.clubs
  add constraint clubs_organization_kind_check
  check (organization_kind in ('club', 'academy'));

alter table public.club_partnership_requests drop constraint if exists club_partnership_requests_organization_kind_check;
alter table public.club_partnership_requests
  add constraint club_partnership_requests_organization_kind_check
  check (organization_kind in ('club', 'academy'));

create or replace function public.goalnova_club_normalize_organization_kind(p_kind text)
returns text
language sql
immutable
as $$
  select case
    when lower(btrim(coalesce(p_kind, ''))) = 'academy' then 'academy'
    else 'club'
  end;
$$;

revoke all on function public.goalnova_club_normalize_organization_kind(text) from public;
grant execute on function public.goalnova_club_normalize_organization_kind(text) to authenticated;

drop function if exists public.goalnova_club_update_profile(uuid, text, text, text, text, text, text, text);

create or replace function public.goalnova_club_update_profile(
  p_club_id uuid,
  p_name text,
  p_city text default null,
  p_country text default null,
  p_website text default null,
  p_instagram text default null,
  p_description text default null,
  p_contact_person text default null,
  p_organization_kind text default null
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
  v_kind text := public.goalnova_club_normalize_organization_kind(p_organization_kind);
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
    organization_kind = case
      when p_organization_kind is null or btrim(p_organization_kind) = '' then organization_kind
      else v_kind
    end,
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
      'club_code', v_club.club_code,
      'organization_kind', coalesce(v_club.organization_kind, 'club')
    )
  );
end;
$$;

revoke all on function public.goalnova_club_update_profile(uuid, text, text, text, text, text, text, text, text) from public;
grant execute on function public.goalnova_club_update_profile(uuid, text, text, text, text, text, text, text, text) to authenticated;

create or replace function public.goalnova_player_club_badge(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when pp.club_id is null then jsonb_build_object('has_club', false)
    else jsonb_build_object(
      'has_club', true,
      'club_id', c.id,
      'club_name', c.name,
      'club_slug', c.slug,
      'club_verified', pp.club_verified,
      'verified_academy', pp.club_verified and c.verified_partner and c.partnership_status = 'active',
      'organization_kind', coalesce(c.organization_kind, 'club')
    )
  end
  from public.player_profiles pp
  left join public.clubs c on c.id = pp.club_id
  where pp.id = p_user_id;
$$;

create or replace function public.goalnova_club_get_public(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_club public.clubs%rowtype;
  v_top_players jsonb;
  v_recent_videos jsonb;
  v_videos int;
begin
  select * into v_club
  from public.clubs c
  where c.slug = trim(p_slug)
     or c.club_code = upper(trim(p_slug))
  limit 1;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  v_videos := v_club.total_videos;
  begin
    v_videos := public.goalnova_club_live_video_count(v_club.id);
  exception
    when undefined_function then
      v_videos := v_club.total_videos;
  end;

  select coalesce(jsonb_agg(row_to_json(tp) order by tp.xp desc), '[]'::jsonb)
  into v_top_players
  from (
    select
      pp.id as user_id,
      coalesce(nullif(trim(pp.full_name), ''), nullif(trim(pp.username), ''), 'Player') as display_name,
      coalesce(nullif(trim(pp.username), ''), '') as username,
      nullif(trim(pp.country), '') as country,
      nullif(trim(u.avatar_url), '') as avatar_url,
      public.goalnova_club_member_xp(cm.user_id) as xp,
      pp.club_verified
    from public.club_memberships cm
    inner join public.player_profiles pp on pp.id = cm.user_id
    inner join public.users u on u.id = cm.user_id
    where cm.club_id = v_club.id and cm.status = 'approved'
    order by xp desc
    limit 12
  ) tp;

  select coalesce(jsonb_agg(row_to_json(rv) order by rv.created_at desc), '[]'::jsonb)
  into v_recent_videos
  from (
    select v.id, v.caption as title, v.thumbnail_url, v.created_at, v.user_id
    from public.videos v
    inner join public.club_memberships cm on cm.user_id = v.user_id
      and cm.club_id = v_club.id and cm.status = 'approved'
    order by v.created_at desc
    limit 8
  ) rv;

  return jsonb_build_object(
    'found', true,
    'club', jsonb_build_object(
      'id', v_club.id,
      'name', v_club.name,
      'slug', v_club.slug,
      'logo_url', v_club.logo_url,
      'cover_url', v_club.cover_url,
      'country', v_club.country,
      'city', v_club.city,
      'website', v_club.website,
      'instagram', v_club.instagram,
      'description', v_club.description,
      'club_code', v_club.club_code,
      'verified_partner', v_club.verified_partner,
      'partnership_status', v_club.partnership_status,
      'approved_player_count', v_club.approved_player_count,
      'total_xp', v_club.total_xp,
      'total_videos', v_videos,
      'club_score', v_club.club_score,
      'global_rank', v_club.global_rank,
      'showcase_public', v_club.showcase_public,
      'minimum_players_required', v_club.minimum_players_required,
      'organization_kind', coalesce(v_club.organization_kind, 'club')
    ),
    'top_players', v_top_players,
    'recent_videos', v_recent_videos
  );
end;
$$;

drop function if exists public.goalnova_club_rankings_public(int);
drop function if exists public.goalnova_clubs_list_public(text, int, int);

create function public.goalnova_clubs_list_public(
  p_search text default null,
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid,
  name text,
  slug text,
  logo_url text,
  cover_url text,
  country text,
  city text,
  club_code text,
  verified_partner boolean,
  partnership_status public.club_partnership_status,
  approved_player_count int,
  total_xp bigint,
  total_videos int,
  club_score bigint,
  global_rank int,
  organization_kind text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id, c.name, c.slug, c.logo_url, c.cover_url, c.country, c.city, c.club_code,
    c.verified_partner, c.partnership_status, c.approved_player_count,
    c.total_xp, c.total_videos, c.club_score, c.global_rank,
    coalesce(c.organization_kind, 'club')
  from public.clubs c
  where (
    coalesce(trim(p_search), '') = ''
    or c.name ilike '%' || trim(p_search) || '%'
    or coalesce(c.country, '') ilike '%' || trim(p_search) || '%'
    or coalesce(c.city, '') ilike '%' || trim(p_search) || '%'
  )
  order by
    case when c.partnership_status = 'active' and c.verified_partner then 0 else 1 end,
    c.club_score desc,
    c.approved_player_count desc,
    c.name asc
  limit greatest(least(coalesce(p_limit, 24), 100), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create function public.goalnova_club_rankings_public(p_limit int default 20)
returns table (
  id uuid,
  name text,
  slug text,
  logo_url text,
  cover_url text,
  country text,
  city text,
  club_code text,
  verified_partner boolean,
  partnership_status public.club_partnership_status,
  approved_player_count int,
  total_xp bigint,
  total_videos int,
  club_score bigint,
  global_rank int,
  organization_kind text
)
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.goalnova_clubs_list_public(null, p_limit, 0) listed
  where listed.partnership_status = 'active' and listed.verified_partner = true;
$$;

grant execute on function public.goalnova_clubs_list_public(text, int, int) to anon, authenticated;
grant execute on function public.goalnova_club_rankings_public(int) to anon, authenticated;
grant execute on function public.goalnova_club_get_public(text) to anon, authenticated;
grant execute on function public.goalnova_player_club_badge(uuid) to anon, authenticated;

drop function if exists public.goalnova_club_submit_partnership_request(text, text, text, text, text, text, int, text);
drop function if exists public.goalnova_club_submit_partnership_request(text, text, text, text, text, text, int, text, text, text);

create function public.goalnova_club_submit_partnership_request(
  p_club_name text,
  p_country text,
  p_contact_person text,
  p_email text,
  p_instagram text default null,
  p_website text default null,
  p_estimated_players int default null,
  p_message text default null,
  p_proof_storage_path text default null,
  p_proof_file_name text default null,
  p_organization_kind text default 'club'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_proof text := nullif(trim(coalesce(p_proof_storage_path, '')), '');
  v_proof_name text := nullif(trim(coalesce(p_proof_file_name, '')), '');
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_proof is not null and position(v_uid::text || '/' in v_proof) <> 1 then
    return jsonb_build_object('ok', false, 'error', 'invalid_proof_path');
  end if;

  insert into public.club_partnership_requests (
    club_name, country, contact_person, email, instagram, website,
    estimated_players, message, applicant_user_id, proof_storage_path, proof_file_name,
    organization_kind
  ) values (
    trim(p_club_name),
    nullif(trim(p_country), ''),
    trim(p_contact_person),
    trim(p_email),
    nullif(trim(p_instagram), ''),
    nullif(trim(p_website), ''),
    p_estimated_players,
    nullif(trim(p_message), ''),
    v_uid,
    v_proof,
    v_proof_name,
    public.goalnova_club_normalize_organization_kind(p_organization_kind)
  )
  returning id into v_id;

  begin
    insert into public.users (id, email, role)
    values (
      v_uid,
      nullif(trim(p_email), ''),
      'club'
    )
    on conflict (id) do update
    set
      role = 'club',
      email = coalesce(nullif(trim(p_email), ''), public.users.email);
  exception
    when others then
      raise warning 'goalnova_club_submit_partnership_request role update failed: %', sqlerrm;
  end;

  return jsonb_build_object('ok', true, 'request_id', v_id);
end;
$$;

revoke all on function public.goalnova_club_submit_partnership_request(text, text, text, text, text, text, int, text, text, text, text) from public;
grant execute on function public.goalnova_club_submit_partnership_request(text, text, text, text, text, text, int, text, text, text, text) to authenticated;

create or replace function public.goalnova_admin_club_approve_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_req public.club_partnership_requests%rowtype;
  v_slug text;
  v_code text;
  v_club_id uuid;
begin
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then raise exception 'Forbidden'; end if;

  select * into v_req from public.club_partnership_requests where id = p_request_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_req.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'already_reviewed'); end if;

  if v_req.proof_storage_path is null or length(trim(v_req.proof_storage_path)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'proof_required');
  end if;

  v_slug := public.goalnova_club_slugify(v_req.club_name);
  if exists (select 1 from public.clubs where slug = v_slug) then
    v_slug := v_slug || '-' || left(replace(gen_random_uuid()::text, '-', ''), 6);
  end if;
  v_code := public.goalnova_club_generate_code(v_req.club_name);

  insert into public.clubs (
    name, slug, country, website, instagram, description, club_code,
    contact_person, contact_email, partnership_status, coach_user_id, organization_kind
  ) values (
    v_req.club_name, v_slug, v_req.country, v_req.website, v_req.instagram,
    coalesce(v_req.message, ''), v_code, v_req.contact_person, v_req.email, 'pending',
    v_req.applicant_user_id,
    public.goalnova_club_normalize_organization_kind(v_req.organization_kind)
  )
  returning id into v_club_id;

  update public.club_partnership_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), created_club_id = v_club_id
  where id = p_request_id;

  if v_req.applicant_user_id is not null then
    insert into public.users (id, email, role)
    values (v_req.applicant_user_id, v_req.email, 'club')
    on conflict (id) do update
    set role = 'club', email = coalesce(excluded.email, public.users.email);

    insert into public.club_memberships (
      club_id, user_id, status, is_admin, reviewed_at, reviewed_by
    ) values (
      v_club_id,
      v_req.applicant_user_id,
      'approved'::public.club_membership_status,
      true,
      now(),
      auth.uid()
    )
    on conflict (club_id, user_id) do update
    set
      status = 'approved'::public.club_membership_status,
      is_admin = true,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now();
  end if;

  perform public.goalnova_admin_audit_log(
    null,
    'club_partnership_request_approved',
    jsonb_build_object('request_id', p_request_id, 'club_id', v_club_id)
  );

  return jsonb_build_object('ok', true, 'club_id', v_club_id, 'club_code', v_code, 'slug', v_slug);
end;
$$;

notify pgrst, 'reload schema';
