-- If an older migration created `messages.body`, rename it to `message` to match the app.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'messages'
      and column_name = 'body'
  ) then
    alter table public.messages rename column body to message;
  end if;
end $$;
