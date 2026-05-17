-- Disable client-callable self-premium RPC (billing bypass).
-- Premium must come from Stripe webhooks, goalnova_admin_set_premium, or referral milestone RPCs.

create or replace function public.goalnova_set_self_premium(p_is_premium boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'goalnova_set_self_premium is disabled; use Stripe checkout or admin grant'
    using errcode = '42501';
end;
$$;

revoke all on function public.goalnova_set_self_premium(boolean) from public;
revoke all on function public.goalnova_set_self_premium(boolean) from authenticated;

create or replace function public.pitchrusch_set_self_premium(p_is_premium boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'pitchrusch_set_self_premium is disabled; use Stripe checkout or admin grant'
    using errcode = '42501';
end;
$$;

revoke all on function public.pitchrusch_set_self_premium(boolean) from public;
revoke all on function public.pitchrusch_set_self_premium(boolean) from authenticated;
