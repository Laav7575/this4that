begin;

create table public.message_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default true
);
alter table public.message_notification_preferences enable row level security;
revoke all on public.message_notification_preferences from public, anon, authenticated;
grant select, insert (user_id, email_enabled), update
  on public.message_notification_preferences to authenticated;
grant select on public.message_notification_preferences to service_role;
create policy message_notification_preference_read on public.message_notification_preferences
  for select to authenticated using (private.is_student() and user_id = auth.uid());
create policy message_notification_preference_create on public.message_notification_preferences
  for insert to authenticated with check (private.is_student() and user_id = auth.uid());
create policy message_notification_preference_edit on public.message_notification_preferences
  for update to authenticated using (private.is_student() and user_id = auth.uid())
  with check (private.is_student() and user_id = auth.uid());

create table public.message_email_deliveries (
  message_id uuid primary key references public.messages(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.message_email_deliveries enable row level security;
revoke all on public.message_email_deliveries from public, anon, authenticated;
grant select, insert, delete on public.message_email_deliveries to service_role;

commit;
