-- Keep club video totals in sync when players upload or delete videos.
-- Paste in Supabase SQL Editor → Run.

create or replace function public.goalnova_club_refresh_stats_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
begin
  if p_user_id is null then
    return;
  end if;

  for v_club_id in
    select cm.club_id
    from public.club_memberships cm
    where cm.user_id = p_user_id
      and cm.status = 'approved'
  loop
    perform public.goalnova_club_refresh_stats(v_club_id);
  end loop;
end;
$$;

create or replace function public.goalnova_club_refresh_stats_for_me()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  perform public.goalnova_club_refresh_stats_for_user(auth.uid());
end;
$$;

create or replace function public.goalnova_club_on_video_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.goalnova_club_refresh_stats_for_user(old.user_id);
    return old;
  end if;

  perform public.goalnova_club_refresh_stats_for_user(new.user_id);
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    perform public.goalnova_club_refresh_stats_for_user(old.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists goalnova_club_on_video_change on public.videos;
create trigger goalnova_club_on_video_change
after insert or update of user_id or delete on public.videos
for each row
execute procedure public.goalnova_club_on_video_change();

revoke all on function public.goalnova_club_refresh_stats_for_user(uuid) from public;
grant execute on function public.goalnova_club_refresh_stats_for_user(uuid) to authenticated;

revoke all on function public.goalnova_club_refresh_stats_for_me() from public;
grant execute on function public.goalnova_club_refresh_stats_for_me() to authenticated;

create or replace function public.goalnova_club_live_video_count(p_club_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.videos v
  inner join public.club_memberships cm
    on cm.user_id = v.user_id
   and cm.club_id = p_club_id
   and cm.status = 'approved';
$$;

revoke all on function public.goalnova_club_live_video_count(uuid) from public;
grant execute on function public.goalnova_club_live_video_count(uuid) to anon, authenticated;

do $$
declare
  v_club uuid;
begin
  for v_club in select id from public.clubs
  loop
    perform public.goalnova_club_refresh_stats(v_club);
  end loop;
end;
$$;
