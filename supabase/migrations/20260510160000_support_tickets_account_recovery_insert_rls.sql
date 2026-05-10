-- Allow anonymous and authenticated clients to INSERT account recovery rows only.
-- (Primary app path uses direct insert; RPC remains as fallback.)

drop policy if exists "support_tickets_insert_account_recovery" on public.support_tickets;

create policy "support_tickets_insert_account_recovery"
on public.support_tickets
for insert
to anon, authenticated
with check (
  ticket_type = 'account_recovery'
  and user_id is null
  and status = 'open'
  and priority = 'normal'
  and category = 'account_issue'
  and trim(subject) = 'Account recovery request'
  and assigned_admin_id is null
  and internal_note is null
  and account_email is not null
  and length(trim(account_email)) between 5 and 254
  and position('@' in trim(account_email)) >= 2
  and contact_email is not null
  and length(trim(contact_email)) between 5 and 254
  and position('@' in trim(contact_email)) >= 2
  and message is not null
  and length(trim(message)) between 10 and 4000
  and (username is null or length(trim(username)) <= 120)
);
