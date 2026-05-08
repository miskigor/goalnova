-- Remove duplicate system/onboarding rows (keep earliest created_at per user_id + type).
delete from public.notifications n
where n.id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by user_id, type
        order by created_at asc
      ) as rn
    from public.notifications
    where type in (
      'welcome',
      'onboarding',
      'profile',
      'upload',
      'scout_verification'
    )
  ) ranked
  where rn > 1
);
