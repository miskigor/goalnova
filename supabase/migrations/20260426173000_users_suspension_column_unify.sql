-- Unify suspension state column to `public.users.is_suspended`.
-- Some environments may still carry legacy `public.users.suspended`.

do $$
begin
  -- If only legacy column exists, rename it to canonical column.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'suspended'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'is_suspended'
  ) then
    alter table public.users rename column suspended to is_suspended;
  end if;
end $$;

alter table public.users
  add column if not exists is_suspended boolean not null default false;

do $$
begin
  -- If both columns exist (drifted DB), migrate true values to canonical column.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'suspended'
  ) then
    execute $sql$
      update public.users
      set is_suspended = coalesce(is_suspended, false) or coalesce(suspended, false)
    $sql$;
  end if;
end $$;

alter table public.users
  alter column is_suspended set default false,
  alter column is_suspended set not null;

comment on column public.users.is_suspended is
  'Canonical suspension flag for user access control.';

-- Ensure admin RPC writes canonical column.
create or replace function public.goalnova_admin_set_suspended(
  p_user_id uuid,
  p_suspended boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
begin
  if actor_id is null then
    raise exception 'auth required';
  end if;

  select u.admin_role
  into actor_role
  from public.users u
  where u.id = actor_id;

  if actor_role not in ('super_admin', 'moderator') then
    raise exception 'insufficient privileges';
  end if;

  update public.users
  set is_suspended = p_suspended
  where id = p_user_id;

  if not found then
    raise exception 'user not found';
  end if;

  insert into public.admin_audit_log(admin_user_id, action, target_user_id, payload)
  values (
    actor_id,
    'set_suspended',
    p_user_id,
    jsonb_build_object('suspended', p_suspended)
  );
end;
$$;

revoke all on function public.goalnova_admin_set_suspended(uuid, boolean) from public;
grant execute on function public.goalnova_admin_set_suspended(uuid, boolean) to authenticated;
