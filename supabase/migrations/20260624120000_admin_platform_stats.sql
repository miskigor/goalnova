-- Admin dashboard: platform usage + profile completeness aggregates.

create or replace function public.goalnova_admin_get_platform_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_staff text;
  v_now timestamptz := now();
  v_7d timestamptz := v_now - interval '7 days';
  v_30d timestamptz := v_now - interval '30 days';
  v_users jsonb;
  v_profiles jsonb;
  v_usage jsonb;
  v_ops jsonb;
begin
  v_staff := public.goalnova_staff_effective_role();
  if v_staff is null then
    raise exception 'Forbidden';
  end if;

  select jsonb_build_object(
    'total', count(*) filter (where coalesce(u.is_deleted, false) = false),
    'players', count(*) filter (where u.role = 'player' and coalesce(u.is_deleted, false) = false),
    'scouts', count(*) filter (where u.role = 'scout' and coalesce(u.is_deleted, false) = false),
    'premium', count(*) filter (
      where coalesce(u.is_deleted, false) = false
        and (
          coalesce(u.is_premium, false) = true
          or (
            u.subscription_plan = 'player_premium'
            and u.subscription_status = 'active'
          )
        )
    ),
    'suspended', count(*) filter (where coalesce(u.is_suspended, false) = true and coalesce(u.is_deleted, false) = false),
    'signups_7d', count(*) filter (where u.created_at >= v_7d and coalesce(u.is_deleted, false) = false),
    'signups_30d', count(*) filter (where u.created_at >= v_30d and coalesce(u.is_deleted, false) = false)
  )
  into v_users
  from public.users u;

  with active_players as (
    select
      pp.*,
      nullif(trim(u.avatar_url), '') as user_avatar_url,
      (
        (case when coalesce(trim(pp.full_name), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.username), '') <> '' then 1 else 0 end) +
        (case when pp.age is not null then 1 else 0 end) +
        (case when coalesce(trim(pp.bio), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.position), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.preferred_foot), '') <> '' then 1 else 0 end) +
        (case when pp.height is not null then 1 else 0 end) +
        (case when pp.weight is not null then 1 else 0 end) +
        (case when coalesce(trim(pp.city), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.country), '') <> '' then 1 else 0 end) +
        (case when coalesce(trim(pp.club), '') <> '' then 1 else 0 end)
      )::int as completeness
    from public.player_profiles pp
    inner join public.users u on u.id = pp.id
    where coalesce(u.is_deleted, false) = false
  ),
  bucket_rows as (
    select completeness as score, count(*)::int as cnt
    from active_players
    group by completeness
    order by completeness
  )
  select jsonb_build_object(
    'player_profiles', (select count(*)::int from active_players),
    'complete_profiles', (select count(*)::int from active_players where completeness = 11),
    'with_avatar', (select count(*)::int from active_players where user_avatar_url is not null),
    'with_video', (
      select count(distinct v.user_id)::int
      from public.videos v
      inner join active_players ap on ap.id = v.user_id
    ),
    'with_ai_analysis', (
      select count(distinct a.user_id)::int
      from public.ai_analyses a
      inner join active_players ap on ap.id = a.user_id
      where coalesce(a.valid_for_football_analysis, true) = true
    ),
    'completeness_buckets', coalesce(
      (select jsonb_agg(jsonb_build_object('score', score, 'count', cnt) order by score)
       from bucket_rows),
      '[]'::jsonb
    ),
    'field_fill', jsonb_build_object(
      'full_name', (select count(*)::int from active_players where coalesce(trim(full_name), '') <> ''),
      'username', (select count(*)::int from active_players where coalesce(trim(username), '') <> ''),
      'age', (select count(*)::int from active_players where age is not null),
      'bio', (select count(*)::int from active_players where coalesce(trim(bio), '') <> ''),
      'position', (select count(*)::int from active_players where coalesce(trim(position), '') <> ''),
      'preferred_foot', (select count(*)::int from active_players where coalesce(trim(preferred_foot), '') <> ''),
      'height', (select count(*)::int from active_players where height is not null),
      'weight', (select count(*)::int from active_players where weight is not null),
      'city', (select count(*)::int from active_players where coalesce(trim(city), '') <> ''),
      'country', (select count(*)::int from active_players where coalesce(trim(country), '') <> ''),
      'club', (select count(*)::int from active_players where coalesce(trim(club), '') <> '')
    )
  )
  into v_profiles;

  select jsonb_build_object(
    'videos_total', (select count(*)::int from public.videos),
    'videos_7d', (select count(*)::int from public.videos where created_at >= v_7d),
    'videos_30d', (select count(*)::int from public.videos where created_at >= v_30d),
    'uploaders', (select count(distinct user_id)::int from public.videos),
    'ai_analyses_total', (select count(*)::int from public.ai_analyses),
    'ai_analyses_valid', (
      select count(*)::int
      from public.ai_analyses
      where coalesce(valid_for_football_analysis, true) = true
    ),
    'ai_analyses_7d', (select count(*)::int from public.ai_analyses where created_at >= v_7d),
    'ai_users', (select count(distinct user_id)::int from public.ai_analyses),
    'messages_total', (select count(*)::int from public.messages),
    'messages_7d', (select count(*)::int from public.messages where created_at >= v_7d),
    'message_users', (
      select count(distinct uid)::int
      from (
        select sender_id as uid from public.messages
        union
        select receiver_id as uid from public.messages
      ) t
    ),
    'likes_total', (select count(*)::int from public.likes),
    'comments_total', (select count(*)::int from public.comments),
    'follows_total', (select count(*)::int from public.follows),
    'challenge_entries_total', (select count(*)::int from public.challenge_entries),
    'weekly_submissions_total', (select count(*)::int from public.weekly_challenge_submissions),
    'friend_challenges_total', (select count(*)::int from public.friend_challenges),
    'quiz_answers_total', (select count(*)::int from public.quiz_user_answers),
    'quiz_users_7d', (
      select count(distinct user_id)::int
      from public.quiz_user_answers
      where answered_at >= v_7d
    ),
    'referrals_total', (select count(*)::int from public.player_referrals),
    'scout_saves_total', (select count(*)::int from public.scout_saved_players),
    'welcome_messages_sent', (
      select count(*)::int
      from public.messages
      where trim(message) = '__gn:welcome_inbox__'
    )
  )
  into v_usage;

  select jsonb_build_object(
    'open_support_tickets', (
      select count(*)::int
      from public.support_tickets
      where status in ('open', 'in_progress')
    ),
    'open_moderation_reports', (
      select count(*)::int
      from public.moderation_reports
      where status = 'open'
    ),
    'pending_scout_verifications', (
      select count(*)::int
      from public.scout_verification_applications
      where status = 'pending'
    )
  )
  into v_ops;

  return jsonb_build_object(
    'generated_at', v_now,
    'users', v_users,
    'profiles', v_profiles,
    'usage', v_usage,
    'operations', v_ops
  );
end;
$$;

revoke all on function public.goalnova_admin_get_platform_stats() from public;
grant execute on function public.goalnova_admin_get_platform_stats() to authenticated;
