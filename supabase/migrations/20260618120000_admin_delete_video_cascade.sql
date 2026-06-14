-- Admin/player video delete: cascade likes/comments FK + robust admin RPC.

-- ---------------------------------------------------------------------------
-- 1) likes.comments → videos ON DELETE CASCADE (legacy tables may lack cascade)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select tc.table_name, tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_schema = kcu.constraint_schema
     and tc.constraint_name = kcu.constraint_name
    where tc.table_schema = 'public'
      and tc.constraint_type = 'FOREIGN KEY'
      and tc.table_name in ('likes', 'comments')
      and kcu.column_name = 'video_id'
  loop
    execute format(
      'alter table public.%I drop constraint if exists %I',
      r.table_name,
      r.constraint_name
    );
  end loop;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'likes'
  ) then
    alter table public.likes
      add constraint likes_video_id_fkey
      foreign key (video_id) references public.videos (id) on delete cascade;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'comments'
  ) then
    alter table public.comments
      add constraint comments_video_id_fkey
      foreign key (video_id) references public.videos (id) on delete cascade;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2) goalnova_admin_delete_video — delete dependents first, verify row removed
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
  v_deleted int;
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

  delete from public.likes where video_id = p_video_id;
  delete from public.comments where video_id = p_video_id;
  delete from public.challenge_entries where video_id = p_video_id;

  begin
    delete from public.challenge_winners where video_id = p_video_id;
  exception
    when undefined_table then null;
  end;

  begin
    delete from public.scout_ai_insight_events where video_id = p_video_id;
  exception
    when undefined_table then null;
  end;

  delete from public.ai_analyses where video_id = p_video_id;

  begin
    delete from public.weekly_challenge_submissions where video_id = p_video_id;
  exception
    when undefined_table then null;
  end;

  delete from public.videos where id = p_video_id;
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    return jsonb_build_object('ok', false, 'error', 'delete_failed');
  end if;

  perform public.goalnova_admin_audit_log(
    v_owner,
    'delete_video',
    jsonb_build_object('video_id', p_video_id)
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.goalnova_admin_delete_video(uuid) from public;
grant execute on function public.goalnova_admin_delete_video(uuid) to authenticated;

-- Staff may delete videos directly when RPC/API is unavailable.
drop policy if exists "videos_delete_staff" on public.videos;
create policy "videos_delete_staff"
  on public.videos
  for delete
  to authenticated
  using (
    public.goalnova_staff_effective_role() in ('super_admin', 'moderator')
  );
