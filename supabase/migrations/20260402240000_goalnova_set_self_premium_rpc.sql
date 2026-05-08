-- Mock billing: lets authenticated users set their own `is_premium` when direct UPDATE is blocked by RLS.
-- Called from the app after `UPDATE public.users` fails; safe with SECURITY DEFINER because only `auth.uid()` is updated.

create or replace function public.goalnova_set_self_premium(p_is_premium boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.users
  set is_premium = p_is_premium
  where id = auth.uid();
end;
$$;

revoke all on function public.goalnova_set_self_premium(boolean) from public;
grant execute on function public.goalnova_set_self_premium(boolean) to authenticated;
