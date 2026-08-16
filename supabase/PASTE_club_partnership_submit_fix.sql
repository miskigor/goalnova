-- Paste in Supabase SQL Editor if club partnership submit fails after the form is filled.
-- 1) Recreates the 10-arg submit function
-- 2) Role update cannot roll back the request
-- 3) Reloads PostgREST schema cache

create or replace function public.goalnova_club_submit_partnership_request(
  p_club_name text,
  p_country text,
  p_contact_person text,
  p_email text,
  p_instagram text default null,
  p_website text default null,
  p_estimated_players int default null,
  p_message text default null,
  p_proof_storage_path text default null,
  p_proof_file_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_proof text := nullif(trim(coalesce(p_proof_storage_path, '')), '');
  v_proof_name text := nullif(trim(coalesce(p_proof_file_name, '')), '');
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_proof is not null and position(v_uid::text || '/' in v_proof) <> 1 then
    return jsonb_build_object('ok', false, 'error', 'invalid_proof_path');
  end if;

  insert into public.club_partnership_requests (
    club_name, country, contact_person, email, instagram, website,
    estimated_players, message, applicant_user_id, proof_storage_path, proof_file_name
  ) values (
    trim(p_club_name),
    nullif(trim(p_country), ''),
    trim(p_contact_person),
    trim(p_email),
    nullif(trim(p_instagram), ''),
    nullif(trim(p_website), ''),
    p_estimated_players,
    nullif(trim(p_message), ''),
    v_uid,
    v_proof,
    v_proof_name
  )
  returning id into v_id;

  begin
    insert into public.users (id, email, role)
    values (
      v_uid,
      nullif(trim(p_email), ''),
      'club'
    )
    on conflict (id) do update
    set
      role = 'club',
      email = coalesce(nullif(trim(p_email), ''), public.users.email);
  exception
    when others then
      raise warning 'goalnova_club_submit_partnership_request role update failed: %', sqlerrm;
  end;

  return jsonb_build_object('ok', true, 'request_id', v_id);
end;
$$;

revoke all on function public.goalnova_club_submit_partnership_request(
  text, text, text, text, text, text, int, text, text, text
) from public;
grant execute on function public.goalnova_club_submit_partnership_request(
  text, text, text, text, text, text, int, text, text, text
) to authenticated;

drop function if exists public.goalnova_club_submit_partnership_request(
  text, text, text, text, text, text, int, text
);

notify pgrst, 'reload schema';
