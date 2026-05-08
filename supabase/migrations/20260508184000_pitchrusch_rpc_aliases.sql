-- Backward-compatible RPC aliases for the GoalNova -> PitchRusch rebrand.
-- Keep existing goalnova_* functions intact; expose pitchrusch_* wrappers.

create or replace function public.pitchrusch_set_self_premium(p_is_premium boolean)
returns void
language sql
security definer
set search_path = public
as $$
  select public.goalnova_set_self_premium(p_is_premium);
$$;

revoke all on function public.pitchrusch_set_self_premium(boolean) from public;
grant execute on function public.pitchrusch_set_self_premium(boolean) to authenticated;

create or replace function public.pitchrusch_notify_players_about_challenge(p_challenge_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.goalnova_notify_players_about_challenge(p_challenge_id);
$$;

revoke all on function public.pitchrusch_notify_players_about_challenge(uuid) from public;
grant execute on function public.pitchrusch_notify_players_about_challenge(uuid) to authenticated;

create or replace function public.pitchrusch_create_support_ticket(
  p_subject text,
  p_message text,
  p_category text
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.goalnova_create_support_ticket(p_subject, p_message, p_category);
$$;

revoke all on function public.pitchrusch_create_support_ticket(text, text, text) from public;
grant execute on function public.pitchrusch_create_support_ticket(text, text, text) to authenticated;

create or replace function public.pitchrusch_user_reply_support_ticket(
  p_ticket_id uuid,
  p_message text
)
returns void
language sql
security definer
set search_path = public
as $$
  select public.goalnova_user_reply_support_ticket(p_ticket_id, p_message);
$$;

revoke all on function public.pitchrusch_user_reply_support_ticket(uuid, text) from public;
grant execute on function public.pitchrusch_user_reply_support_ticket(uuid, text) to authenticated;
