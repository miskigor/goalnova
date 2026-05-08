-- Ensure admin user detail returns effective player profile values
-- and metadata about the source table used.

create or replace function public.goalnova_admin_get_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_user jsonb;
  v_player_raw jsonb;
  v_player jsonb;
  v_player_exists boolean := false;
  v_player_source text := 'none';
  v_scout jsonb;
  v_age numeric;
  v_height numeric;
  v_weight numeric;
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
  into v_player_raw
  from public.player_profiles pp
  where pp.id = p_user_id;

  if v_player_raw is not null then
    v_player_exists := true;
    v_player_source := 'player_profiles';
  else
    v_player_source := 'users_fallback';
  end if;

  -- Build an effective player profile object:
  -- prefer player_profiles values; fallback to users JSON keys when available.
  v_age := nullif(coalesce(v_player_raw->>'age', v_user->>'age', ''), '')::numeric;
  v_height := nullif(coalesce(v_player_raw->>'height', v_user->>'height', ''), '')::numeric;
  v_weight := nullif(coalesce(v_player_raw->>'weight', v_user->>'weight', ''), '')::numeric;

  v_player := jsonb_build_object(
    'id', p_user_id,
    'full_name', nullif(coalesce(v_player_raw->>'full_name', v_user->>'full_name', ''), ''),
    'username', nullif(coalesce(v_player_raw->>'username', v_user->>'username', ''), ''),
    'bio', nullif(coalesce(v_player_raw->>'bio', v_user->>'bio', ''), ''),
    'city', nullif(coalesce(v_player_raw->>'city', v_user->>'city', ''), ''),
    'country', nullif(coalesce(v_player_raw->>'country', v_user->>'country', ''), ''),
    'position', nullif(coalesce(v_player_raw->>'position', v_user->>'position', ''), ''),
    'club', nullif(coalesce(v_player_raw->>'club', v_user->>'club', ''), ''),
    'preferred_foot', nullif(coalesce(v_player_raw->>'preferred_foot', v_user->>'preferred_foot', ''), ''),
    'age', v_age,
    'height', v_height,
    'weight', v_weight
  );

  select to_jsonb(sp.*)
  into v_scout
  from public.scout_profiles sp
  where sp.id = p_user_id;

  return jsonb_build_object(
    'user', v_user,
    'player_profile', v_player,
    'player_profile_exists', v_player_exists,
    'player_profile_source', v_player_source,
    'scout_profile', v_scout
  );
end;
$$;

revoke all on function public.goalnova_admin_get_user_detail(uuid) from public;
grant execute on function public.goalnova_admin_get_user_detail(uuid) to authenticated;
