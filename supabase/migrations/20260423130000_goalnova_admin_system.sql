-- PitchRusch admin system: roles, soft flags, support tickets, moderation reports, audit log, RPCs.

-- ---------------------------------------------------------------------------
-- 1) users: admin_role, suspension, soft delete
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists admin_role text
    check (admin_role is null or admin_role in ('super_admin', 'support_admin', 'moderator'));

alter table public.users
  add column if not exists is_suspended boolean not null default false;

alter table public.users
  add column if not exists is_deleted boolean not null default false;

comment on column public.users.admin_role is 'Staff role: super_admin | support_admin | moderator. NULL = not staff. Legacy is_admin still grants super_admin-equivalent checks until migrated.';
comment on column public.users.is_suspended is 'Account suspended by admin; app should block sign-in / actions via RLS or app layer.';
comment on column public.users.is_deleted is 'Soft-deleted user; hide from public lists; super_admin only to set.';

update public.users
set admin_role = 'super_admin'
where coalesce(is_admin, false) = true
  and admin_role is null;

-- ---------------------------------------------------------------------------
-- 2) support_tickets
-- ---------------------------------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_admin_id uuid references public.users (id) on delete set null,
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_id_idx on public.support_tickets (user_id);
create index if not exists support_tickets_status_idx on public.support_tickets (status);
create index if not exists support_tickets_assigned_admin_id_idx on public.support_tickets (assigned_admin_id);
create index if not exists support_tickets_created_at_idx on public.support_tickets (created_at desc);

alter table public.support_tickets enable row level security;

-- ---------------------------------------------------------------------------
-- 3) moderation_reports (user-submitted or admin-created stubs)
-- ---------------------------------------------------------------------------
create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references public.users (id) on delete set null,
  target_type text not null check (target_type in ('video', 'comment')),
  target_id uuid not null,
  reason text,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  assigned_admin_id uuid references public.users (id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists moderation_reports_status_idx on public.moderation_reports (status);
create index if not exists moderation_reports_assigned_idx on public.moderation_reports (assigned_admin_id);

alter table public.moderation_reports enable row level security;

-- ---------------------------------------------------------------------------
-- 4) admin_audit_log
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.users (id) on delete set null,
  target_user_id uuid references public.users (id) on delete set null,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_admin_user_id_idx on public.admin_audit_log (admin_user_id);

alter table public.admin_audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- 5) Helpers: effective staff role (legacy is_admin => super_admin)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_staff_effective_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when u.admin_role is not null then u.admin_role
    when coalesce(u.is_admin, false) then 'super_admin'::text
    else null
  end
  from public.users u
  where u.id = auth.uid();
$$;

create or replace function public.goalnova_staff_effective_role(p_uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when u.admin_role is not null then u.admin_role
    when coalesce(u.is_admin, false) then 'super_admin'::text
    else null
  end
  from public.users u
  where u.id = p_uid;
$$;

revoke all on function public.goalnova_staff_effective_role() from public;
grant execute on function public.goalnova_staff_effective_role() to authenticated;

revoke all on function public.goalnova_staff_effective_role(uuid) from public;
grant execute on function public.goalnova_staff_effective_role(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Audit append (internal use from other RPCs)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_audit_log(
  p_target_user_id uuid,
  p_action text,
  p_details jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  insert into public.admin_audit_log (admin_user_id, target_user_id, action, details)
  values (auth.uid(), p_target_user_id, p_action, p_details);
end;
$$;

revoke all on function public.goalnova_admin_audit_log(uuid, text, jsonb) from public;
grant execute on function public.goalnova_admin_audit_log(uuid, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 7) Scout verification: super_admin only (not support / moderator)
-- ---------------------------------------------------------------------------
create or replace function public.admin_review_scout_verification(
  p_subject_user_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_current text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_role := public.goalnova_staff_effective_role();
  if v_role is null or v_role <> 'super_admin' then
    raise exception 'Forbidden';
  end if;

  if p_action is null or lower(trim(p_action)) not in ('approve', 'reject') then
    raise exception 'Invalid action';
  end if;

  select status
  into v_current
  from public.scout_verification_applications
  where user_id = p_subject_user_id;

  if not found then
    raise exception 'Application not found';
  end if;

  if lower(trim(p_action)) = 'approve' then
    if v_current = 'approved' then
      return jsonb_build_object('ok', true, 'noop', true);
    end if;

    update public.scout_verification_applications
    set status = 'approved'
    where user_id = p_subject_user_id;

    update public.users
    set scout_verification_status = 'approved'
    where id = p_subject_user_id;

    perform public.goalnova_admin_audit_log(
      p_subject_user_id,
      'scout_verification_approve',
      jsonb_build_object('subject', p_subject_user_id)
    );

    begin
      savepoint admin_scout_verification_notify;
      insert into public.notifications (user_id, type, message, related_user_id)
      values (
        p_subject_user_id,
        'scout_verification',
        'Your scout verification was approved.',
        p_subject_user_id
      );
    exception
      when others then
        rollback to savepoint admin_scout_verification_notify;
    end;

  else
    if v_current = 'rejected' then
      return jsonb_build_object('ok', true, 'noop', true);
    end if;

    update public.scout_verification_applications
    set status = 'rejected'
    where user_id = p_subject_user_id;

    update public.users
    set scout_verification_status = 'rejected'
    where id = p_subject_user_id;

    perform public.goalnova_admin_audit_log(
      p_subject_user_id,
      'scout_verification_reject',
      jsonb_build_object('subject', p_subject_user_id)
    );

    begin
      savepoint admin_scout_verification_notify;
      insert into public.notifications (user_id, type, message, related_user_id)
      values (
        p_subject_user_id,
        'scout_verification',
        'Your scout verification was not approved.',
        p_subject_user_id
      );
    exception
      when others then
        rollback to savepoint admin_scout_verification_notify;
    end;
  end if;

  return jsonb_build_object('ok', true, 'noop', false);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8) List users (staff)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_list_users(
  p_limit int default 50,
  p_offset int default 0,
  p_search text default null
)
returns table (
  id uuid,
  email text,
  role text,
  admin_role text,
  is_premium boolean,
  scout_verification_status text,
  is_suspended boolean,
  is_deleted boolean,
  created_at timestamptz,
  full_name text,
  username text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_search text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  v_search := nullif(trim(coalesce(p_search, '')), '');

  return query
  select
    u.id,
    u.email,
    u.role,
    u.admin_role,
    u.is_premium,
    u.scout_verification_status,
    u.is_suspended,
    u.is_deleted,
    u.created_at,
    pp.full_name,
    pp.username
  from public.users u
  left join public.player_profiles pp on pp.id = u.id
  where
    (v_staff = 'super_admin' or u.is_deleted = false)
    and (
      v_search is null
      or u.email ilike '%' || v_search || '%'
      or coalesce(pp.full_name, '') ilike '%' || v_search || '%'
      or coalesce(pp.username, '') ilike '%' || v_search || '%'
    )
  order by u.created_at desc nulls last
  limit greatest(1, least(p_limit, 200))
  offset greatest(0, p_offset);
end;
$$;

revoke all on function public.goalnova_admin_list_users(int, int, text) from public;
grant execute on function public.goalnova_admin_list_users(int, int, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9) User detail JSON (staff)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_get_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_user jsonb;
  v_player jsonb;
  v_scout jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  select to_jsonb(u.*)
  into v_user
  from public.users u
  where u.id = p_user_id;

  if v_user is null then
    return null;
  end if;

  if v_staff <> 'super_admin' and coalesce((v_user->>'is_deleted')::boolean, false) then
    raise exception 'Forbidden';
  end if;

  select to_jsonb(pp.*)
  into v_player
  from public.player_profiles pp
  where pp.id = p_user_id;

  select to_jsonb(sp.*)
  into v_scout
  from public.scout_profiles sp
  where sp.id = p_user_id;

  return jsonb_build_object(
    'user', v_user,
    'player_profile', v_player,
    'scout_profile', v_scout
  );
end;
$$;

revoke all on function public.goalnova_admin_get_user_detail(uuid) from public;
grant execute on function public.goalnova_admin_get_user_detail(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 10) Suspend / soft delete / premium / scout status / staff role (RBAC)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_set_suspended(
  p_user_id uuid,
  p_suspended boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or (v_staff = 'support_admin') then
    raise exception 'Forbidden';
  end if;

  update public.users
  set is_suspended = p_suspended
  where id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'set_suspended',
    jsonb_build_object('suspended', p_suspended)
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.goalnova_admin_set_deleted(
  p_user_id uuid,
  p_deleted boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff <> 'super_admin' then
    raise exception 'Forbidden';
  end if;

  update public.users
  set is_deleted = p_deleted
  where id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'set_deleted',
    jsonb_build_object('deleted', p_deleted)
  );

  return jsonb_build_object('ok', true);
end;
$$;

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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff <> 'super_admin' then
    raise exception 'Forbidden';
  end if;

  update public.users
  set is_premium = p_premium
  where id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'set_premium',
    jsonb_build_object('is_premium', p_premium)
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.goalnova_admin_set_scout_verification_status(
  p_user_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff <> 'super_admin' then
    raise exception 'Forbidden';
  end if;

  v_status := lower(trim(p_status));
  if v_status not in ('none', 'pending', 'approved', 'rejected') then
    raise exception 'Invalid status';
  end if;

  update public.users
  set scout_verification_status = v_status
  where id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'set_scout_verification_status',
    jsonb_build_object('status', v_status)
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.goalnova_admin_set_staff_role(
  p_user_id uuid,
  p_admin_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff <> 'super_admin' then
    raise exception 'Forbidden';
  end if;

  if p_admin_role is null or trim(p_admin_role) = '' then
    update public.users
    set admin_role = null, is_admin = false
    where id = p_user_id;
    perform public.goalnova_admin_audit_log(
      p_user_id,
      'revoke_staff_role',
      null
    );
    return jsonb_build_object('ok', true);
  end if;

  v_role := lower(trim(p_admin_role));
  if v_role not in ('super_admin', 'support_admin', 'moderator') then
    raise exception 'Invalid admin_role';
  end if;

  update public.users
  set
    admin_role = v_role,
    is_admin = true
  where id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'set_staff_role',
    jsonb_build_object('admin_role', v_role)
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.goalnova_admin_set_app_role(
  p_user_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff <> 'super_admin' then
    raise exception 'Forbidden';
  end if;

  v_role := lower(trim(p_role));
  if v_role not in ('player', 'scout') then
    raise exception 'Invalid role';
  end if;

  update public.users
  set role = v_role
  where id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'set_app_role',
    jsonb_build_object('role', v_role)
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.goalnova_admin_set_suspended(uuid, boolean) from public;
grant execute on function public.goalnova_admin_set_suspended(uuid, boolean) to authenticated;

revoke all on function public.goalnova_admin_set_deleted(uuid, boolean) from public;
grant execute on function public.goalnova_admin_set_deleted(uuid, boolean) to authenticated;

revoke all on function public.goalnova_admin_set_premium(uuid, boolean) from public;
grant execute on function public.goalnova_admin_set_premium(uuid, boolean) to authenticated;

revoke all on function public.goalnova_admin_set_scout_verification_status(uuid, text) from public;
grant execute on function public.goalnova_admin_set_scout_verification_status(uuid, text) to authenticated;

revoke all on function public.goalnova_admin_set_staff_role(uuid, text) from public;
grant execute on function public.goalnova_admin_set_staff_role(uuid, text) to authenticated;

revoke all on function public.goalnova_admin_set_app_role(uuid, text) from public;
grant execute on function public.goalnova_admin_set_app_role(uuid, text) to authenticated;

-- Fix: support_admin should NOT suspend per spec — only super + moderator.
-- Re-read user message: "support_admin ... cannot hard delete" — suspend not listed for support.
-- "moderator can ... suspend problematic accounts"
-- "super_admin can ... suspend users"
-- So suspend: super_admin + moderator only. Current goalnova_admin_set_suspended already blocks support_admin. Good.

-- ---------------------------------------------------------------------------
-- 11) Merge player profile (JSON patch, RBAC)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_merge_player_profile(
  p_user_id uuid,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  k text;
  allowed_support text[] := array[
    'full_name', 'username', 'bio', 'city', 'country', 'position',
    'club', 'age', 'height', 'weight', 'preferred_foot'
  ];
  allowed_super text[] := array[
    'full_name', 'username', 'bio', 'city', 'country', 'position',
    'club', 'age', 'height', 'weight', 'preferred_foot'
  ];
  allowed_mod text[] := array[]::text[];
  keys text[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  if p_patch is null or p_patch = '{}'::jsonb then
    return jsonb_build_object('ok', true, 'noop', true);
  end if;

  keys := array(select jsonb_object_keys(p_patch));
  FOREACH k IN ARRAY keys
  loop
    if v_staff = 'super_admin' then
      if not (k = any(allowed_super)) then
        raise exception 'Invalid player profile field: %', k;
      end if;
    elsif v_staff = 'support_admin' then
      if not (k = any(allowed_support)) then
        raise exception 'Forbidden field for support: %', k;
      end if;
    else
      if not (k = any(allowed_mod)) then
        raise exception 'Forbidden';
      end if;
    end if;
  end loop;

  insert into public.player_profiles (id)
  values (p_user_id)
  on conflict (id) do nothing;

  update public.player_profiles pp
  set
    full_name = case when p_patch ? 'full_name' then nullif(p_patch->>'full_name', '') else pp.full_name end,
    username = case when p_patch ? 'username' then nullif(p_patch->>'username', '') else pp.username end,
    bio = case when p_patch ? 'bio' then nullif(p_patch->>'bio', '') else pp.bio end,
    city = case when p_patch ? 'city' then nullif(p_patch->>'city', '') else pp.city end,
    country = case when p_patch ? 'country' then nullif(p_patch->>'country', '') else pp.country end,
    position = case when p_patch ? 'position' then nullif(p_patch->>'position', '') else pp.position end,
    club = case when p_patch ? 'club' then nullif(p_patch->>'club', '') else pp.club end,
    age = case when p_patch ? 'age' then (nullif(p_patch->>'age', ''))::int else pp.age end,
    height = case when p_patch ? 'height' then (nullif(p_patch->>'height', ''))::int else pp.height end,
    weight = case when p_patch ? 'weight' then (nullif(p_patch->>'weight', ''))::int else pp.weight end,
    preferred_foot = case when p_patch ? 'preferred_foot' then nullif(p_patch->>'preferred_foot', '') else pp.preferred_foot end
  where pp.id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'merge_player_profile',
    p_patch
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.goalnova_admin_merge_player_profile(uuid, jsonb) from public;
grant execute on function public.goalnova_admin_merge_player_profile(uuid, jsonb) to authenticated;
-- ---------------------------------------------------------------------------
-- 12) Merge scout profile (RBAC)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_merge_scout_profile(
  p_user_id uuid,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  k text;
  allowed_support text[] := array['bio', 'organization', 'role', 'city', 'country'];
  allowed_super text[] := array['bio', 'organization', 'role', 'city', 'country'];
  keys text[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  if p_patch is null or p_patch = '{}'::jsonb then
    return jsonb_build_object('ok', true, 'noop', true);
  end if;

  keys := array(select jsonb_object_keys(p_patch));
  FOREACH k IN ARRAY keys
  loop
    if v_staff = 'super_admin' then
      if not (k = any(allowed_super)) then
        raise exception 'Invalid scout profile field: %', k;
      end if;
    elsif v_staff = 'support_admin' then
      if not (k = any(allowed_support)) then
        raise exception 'Forbidden field for support: %', k;
      end if;
    else
      raise exception 'Forbidden';
    end if;
  end loop;

  insert into public.scout_profiles (id)
  values (p_user_id)
  on conflict (id) do nothing;

  update public.scout_profiles sp
  set
    bio = case when p_patch ? 'bio' then nullif(p_patch->>'bio', '') else sp.bio end,
    organization = case when p_patch ? 'organization' then nullif(p_patch->>'organization', '') else sp.organization end,
    role = case when p_patch ? 'role' then nullif(p_patch->>'role', '') else sp.role end,
    city = case when p_patch ? 'city' then nullif(p_patch->>'city', '') else sp.city end,
    country = case when p_patch ? 'country' then nullif(p_patch->>'country', '') else sp.country end
  where sp.id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'merge_scout_profile',
    p_patch
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.goalnova_admin_merge_scout_profile(uuid, jsonb) from public;
grant execute on function public.goalnova_admin_merge_scout_profile(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 13) Merge scout application columns on users (super + support)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_merge_scout_apply_fields(
  p_user_id uuid,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  k text;
  allowed text[] := array[
    'scout_apply_full_name', 'scout_apply_organization', 'scout_apply_business_email',
    'scout_apply_country', 'scout_apply_description', 'scout_apply_web_url'
  ];
  keys text[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff = 'moderator' then
    raise exception 'Forbidden';
  end if;

  if p_patch is null or p_patch = '{}'::jsonb then
    return jsonb_build_object('ok', true, 'noop', true);
  end if;

  keys := array(select jsonb_object_keys(p_patch));
  FOREACH k IN ARRAY keys
  loop
    if not (k = any(allowed)) then
      raise exception 'Invalid field: %', k;
    end if;
  end loop;

  update public.users u
  set
    scout_apply_full_name = case when p_patch ? 'scout_apply_full_name' then nullif(p_patch->>'scout_apply_full_name', '') else u.scout_apply_full_name end,
    scout_apply_organization = case when p_patch ? 'scout_apply_organization' then nullif(p_patch->>'scout_apply_organization', '') else u.scout_apply_organization end,
    scout_apply_business_email = case when p_patch ? 'scout_apply_business_email' then nullif(p_patch->>'scout_apply_business_email', '') else u.scout_apply_business_email end,
    scout_apply_country = case when p_patch ? 'scout_apply_country' then nullif(p_patch->>'scout_apply_country', '') else u.scout_apply_country end,
    scout_apply_description = case when p_patch ? 'scout_apply_description' then nullif(p_patch->>'scout_apply_description', '') else u.scout_apply_description end,
    scout_apply_web_url = case when p_patch ? 'scout_apply_web_url' then nullif(p_patch->>'scout_apply_web_url', '') else u.scout_apply_web_url end
  where u.id = p_user_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'merge_scout_apply_fields',
    p_patch
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.goalnova_admin_merge_scout_apply_fields(uuid, jsonb) from public;
grant execute on function public.goalnova_admin_merge_scout_apply_fields(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 14) Support tickets
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_create_support_ticket(
  p_subject text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_uid := auth.uid();
  if length(trim(coalesce(p_subject, ''))) < 2 then
    raise exception 'Invalid subject';
  end if;
  if length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Invalid message';
  end if;

  insert into public.support_tickets (user_id, subject, message)
  values (v_uid, trim(p_subject), trim(p_message))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.goalnova_create_support_ticket(text, text) from public;
grant execute on function public.goalnova_create_support_ticket(text, text) to authenticated;

create or replace function public.goalnova_admin_list_support_tickets(
  p_status text default null,
  p_assigned_to_me boolean default false,
  p_limit int default 100
)
returns setof public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  v_status := nullif(lower(trim(coalesce(p_status, ''))), '');

  return query
  select t.*
  from public.support_tickets t
  where
    (v_status is null or t.status = v_status)
    and (
      not p_assigned_to_me
      or t.assigned_admin_id = auth.uid()
    )
  order by t.created_at desc
  limit greatest(1, least(p_limit, 500));
end;
$$;

revoke all on function public.goalnova_admin_list_support_tickets(text, boolean, int) from public;
grant execute on function public.goalnova_admin_list_support_tickets(text, boolean, int) to authenticated;

create or replace function public.goalnova_admin_update_support_ticket(
  p_ticket_id uuid,
  p_status text default null,
  p_priority text default null,
  p_assigned_admin_id uuid default null,
  p_internal_note text default null,
  p_clear_assignment boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_status text;
  v_pri text;
  v_ticket_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  select user_id into v_ticket_user from public.support_tickets where id = p_ticket_id;
  if v_ticket_user is null then
    raise exception 'Ticket not found';
  end if;

  if p_status is not null and trim(p_status) <> '' then
    v_status := lower(trim(p_status));
    if v_status not in ('open', 'in_progress', 'resolved', 'closed') then
      raise exception 'Invalid status';
    end if;
  end if;

  if p_priority is not null and trim(p_priority) <> '' then
    v_pri := lower(trim(p_priority));
    if v_pri not in ('low', 'normal', 'high', 'urgent') then
      raise exception 'Invalid priority';
    end if;
  end if;

  if p_assigned_admin_id is not null and v_staff <> 'super_admin' then
    if p_assigned_admin_id <> auth.uid() then
      raise exception 'Forbidden';
    end if;
  end if;

  update public.support_tickets t
  set
    status = coalesce(v_status, t.status),
    priority = coalesce(v_pri, t.priority),
    assigned_admin_id = case
      when p_clear_assignment then null
      when p_assigned_admin_id is not null then p_assigned_admin_id
      else t.assigned_admin_id
    end,
    internal_note = coalesce(p_internal_note, t.internal_note),
    updated_at = now()
  where t.id = p_ticket_id;

  perform public.goalnova_admin_audit_log(
    v_ticket_user,
    'support_ticket_update',
    jsonb_build_object(
      'ticket_id', p_ticket_id,
      'status', p_status,
      'priority', p_priority,
      'assigned_admin_id', p_assigned_admin_id,
      'clear_assignment', p_clear_assignment
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.goalnova_admin_update_support_ticket(uuid, text, text, uuid, text, boolean) from public;
grant execute on function public.goalnova_admin_update_support_ticket(uuid, text, text, uuid, text, boolean) to authenticated;

create or replace function public.goalnova_admin_create_support_ticket_for_user(
  p_user_id uuid,
  p_subject text,
  p_message text,
  p_assigned_admin_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff = 'moderator' then
    raise exception 'Forbidden';
  end if;

  if length(trim(coalesce(p_subject, ''))) < 2 then
    raise exception 'Invalid subject';
  end if;
  if length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Invalid message';
  end if;

  if p_assigned_admin_id is not null and v_staff <> 'super_admin' and p_assigned_admin_id <> auth.uid() then
    raise exception 'Forbidden';
  end if;

  insert into public.support_tickets (user_id, subject, message, assigned_admin_id, status)
  values (
    p_user_id,
    trim(p_subject),
    trim(p_message),
    p_assigned_admin_id,
    'open'
  )
  returning id into v_id;

  perform public.goalnova_admin_audit_log(
    p_user_id,
    'support_ticket_created_by_admin',
    jsonb_build_object('ticket_id', v_id, 'assigned_admin_id', p_assigned_admin_id)
  );

  return v_id;
end;
$$;

revoke all on function public.goalnova_admin_create_support_ticket_for_user(uuid, text, text, uuid) from public;
grant execute on function public.goalnova_admin_create_support_ticket_for_user(uuid, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 15) Moderation: delete video / comment (moderator + super_admin)
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_delete_video(p_video_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff = 'support_admin' then
    raise exception 'Forbidden';
  end if;

  select user_id into v_owner from public.videos where id = p_video_id;
  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  delete from public.videos where id = p_video_id;

  perform public.goalnova_admin_audit_log(
    v_owner,
    'delete_video',
    jsonb_build_object('video_id', p_video_id)
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.goalnova_admin_delete_comment(p_comment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff = 'support_admin' then
    raise exception 'Forbidden';
  end if;

  select user_id into v_user from public.comments where id = p_comment_id;
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  delete from public.comments where id = p_comment_id;

  perform public.goalnova_admin_audit_log(
    v_user,
    'delete_comment',
    jsonb_build_object('comment_id', p_comment_id)
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.goalnova_admin_delete_video(uuid) from public;
grant execute on function public.goalnova_admin_delete_video(uuid) to authenticated;

revoke all on function public.goalnova_admin_delete_comment(uuid) from public;
grant execute on function public.goalnova_admin_delete_comment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 16) Moderation reports
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_list_moderation_reports(
  p_status text default 'open',
  p_limit int default 100
)
returns setof public.moderation_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_st text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff = 'support_admin' then
    raise exception 'Forbidden';
  end if;

  v_st := coalesce(nullif(lower(trim(p_status)), ''), 'open');

  return query
  select r.*
  from public.moderation_reports r
  where r.status = v_st
  order by r.created_at desc
  limit greatest(1, least(p_limit, 300));
end;
$$;

create or replace function public.goalnova_admin_update_moderation_report(
  p_report_id uuid,
  p_status text,
  p_assigned_admin_id uuid default null,
  p_resolution_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_st text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null or v_staff = 'support_admin' then
    raise exception 'Forbidden';
  end if;

  v_st := lower(trim(p_status));
  if v_st not in ('open', 'reviewing', 'resolved', 'dismissed') then
    raise exception 'Invalid status';
  end if;

  update public.moderation_reports r
  set
    status = v_st,
    assigned_admin_id = coalesce(p_assigned_admin_id, r.assigned_admin_id),
    resolution_note = coalesce(p_resolution_note, r.resolution_note),
    updated_at = now()
  where r.id = p_report_id;

  perform public.goalnova_admin_audit_log(
    null,
    'moderation_report_update',
    jsonb_build_object('report_id', p_report_id, 'status', v_st)
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.goalnova_admin_list_moderation_reports(text, int) from public;
grant execute on function public.goalnova_admin_list_moderation_reports(text, int) to authenticated;

revoke all on function public.goalnova_admin_update_moderation_report(uuid, text, uuid, text) from public;
grant execute on function public.goalnova_admin_update_moderation_report(uuid, text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 17) Audit log read
-- ---------------------------------------------------------------------------
create or replace function public.goalnova_admin_list_audit_log(p_limit int default 100)
returns setof public.admin_audit_log
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  return query
  select a.*
  from public.admin_audit_log a
  order by a.created_at desc
  limit greatest(1, least(p_limit, case when v_staff = 'super_admin' then 500 else 200 end));
end;
$$;

revoke all on function public.goalnova_admin_list_audit_log(int) from public;
grant execute on function public.goalnova_admin_list_audit_log(int) to authenticated;

-- ---------------------------------------------------------------------------
-- 18) Scout verification RLS: any staff can read applications (approve still super-only RPC)
-- ---------------------------------------------------------------------------
drop policy if exists "scout_verification_applications_select_admin" on public.scout_verification_applications;

create policy "scout_verification_applications_select_admin"
  on public.scout_verification_applications
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and (
          coalesce(u.is_admin, false)
          or u.admin_role is not null
        )
    )
  );

drop policy if exists "scout_verification_docs_select_admin" on storage.objects;

create policy "scout_verification_docs_select_admin"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'scout-verification-documents'
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and (
          coalesce(u.is_admin, false)
          or u.admin_role is not null
        )
    )
  );
