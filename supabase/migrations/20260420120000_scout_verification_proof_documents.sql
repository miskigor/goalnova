-- PitchRusch scout proof uploads — Supabase setup
--
-- • Private bucket: scout-verification-documents (public = false; no anon policies).
-- • storage.objects RLS: only role `authenticated`, paths under auth.uid()/… only.
-- • public.scout_verification_applications: proof_document_url (object path), _name, _type.
-- • submit_scout_verification_application RPC persists proof + sets user pending.

alter table if exists storage.objects enable row level security;

alter table public.scout_verification_applications
  add column if not exists proof_document_url text,
  add column if not exists proof_document_name text,
  add column if not exists proof_document_type text;

comment on column public.scout_verification_applications.proof_document_url is
  'Storage object path within bucket scout-verification-documents (not a public URL).';
comment on column public.scout_verification_applications.proof_document_name is
  'Original filename as uploaded.';
comment on column public.scout_verification_applications.proof_document_type is
  'MIME type of the proof file.';

-- Private bucket: no anonymous access; RLS below restricts authenticated users to own prefix.
insert into storage.buckets (id, name, public)
values ('scout-verification-documents', 'scout-verification-documents', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "scout_verification_docs_insert_own" on storage.objects;
drop policy if exists "scout_verification_docs_select_own" on storage.objects;
drop policy if exists "scout_verification_docs_update_own" on storage.objects;
drop policy if exists "scout_verification_docs_delete_own" on storage.objects;

create policy "scout_verification_docs_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'scout-verification-documents'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "scout_verification_docs_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'scout-verification-documents'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "scout_verification_docs_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'scout-verification-documents'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'scout-verification-documents'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "scout_verification_docs_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'scout-verification-documents'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop function if exists public.submit_scout_verification_application(text, text, text, text, text, text);
drop function if exists public.submit_scout_verification_application(text, text, text, text, text, text, text, text, text);

create or replace function public.submit_scout_verification_application(
  p_business_email text,
  p_country text,
  p_description text,
  p_full_name text,
  p_organization text,
  p_web_url text,
  p_proof_document_url text,
  p_proof_document_name text,
  p_proof_document_type text
)
returns public.scout_verification_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.scout_verification_applications;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_proof_document_url is null
     or length(trim(p_proof_document_url)) = 0
     or p_proof_document_name is null
     or length(trim(p_proof_document_name)) = 0
     or p_proof_document_type is null
     or length(trim(p_proof_document_type)) = 0
  then
    raise exception 'Proof document metadata is required';
  end if;

  if split_part(trim(p_proof_document_url), '/', 1) <> v_user_id::text then
    raise exception 'Proof document path must be under the caller user id';
  end if;

  insert into public.scout_verification_applications (
    user_id,
    full_name,
    organization,
    business_email,
    country,
    description,
    web_url,
    status,
    proof_document_url,
    proof_document_name,
    proof_document_type
  )
  values (
    v_user_id,
    p_full_name,
    p_organization,
    p_business_email,
    p_country,
    p_description,
    p_web_url,
    'pending',
    trim(p_proof_document_url),
    trim(p_proof_document_name),
    trim(p_proof_document_type)
  )
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        organization = excluded.organization,
        business_email = excluded.business_email,
        country = excluded.country,
        description = excluded.description,
        web_url = excluded.web_url,
        status = 'pending',
        proof_document_url = excluded.proof_document_url,
        proof_document_name = excluded.proof_document_name,
        proof_document_type = excluded.proof_document_type;

  update public.users
  set scout_verification_status = 'pending'
  where id = v_user_id;

  select *
  into v_row
  from public.scout_verification_applications
  where user_id = v_user_id;

  return v_row;
end;
$$;

revoke all on function public.submit_scout_verification_application(text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_scout_verification_application(text, text, text, text, text, text, text, text, text) to authenticated;
