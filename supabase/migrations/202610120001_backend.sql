begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Reads and writes require a confirmed Waterloo identity from Auth, not user metadata.
create function private.is_student() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users where id = auth.uid()
    and email_confirmed_at is not null and lower(split_part(email, '@', 2)) = 'uwaterloo.ca');
$$;
revoke all on function private.is_student() from public;
grant execute on function private.is_student() to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  program text not null default '', bio text not null default '' check (char_length(bio) <= 2000),
  avatar text, skills text[] not null default '{}'
);
-- Email remains in Auth; public profile rows never contain private email or a writable verification flag.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text not null check (char_length(description) between 1 and 5000),
  category text not null, type text not null check (type in ('Offer', 'Request')),
  availability text not null, location text not null,
  created_at timestamptz not null default now()
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(), related_post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 5000),
  timestamp timestamptz not null default now()
);
create index posts_feed on public.posts(created_at desc, id desc);
create index participant_users on public.conversation_participants(user_id, conversation_id);
create index message_history on public.messages(conversation_id, timestamp desc, id desc);

create function private.is_participant(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.conversation_participants where conversation_id = target and user_id = auth.uid());
$$;
revoke all on function private.is_participant(uuid) from public;
grant execute on function private.is_participant(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
revoke all on public.profiles, public.posts, public.conversations, public.conversation_participants, public.messages from anon, authenticated;
grant select on public.profiles, public.posts, public.conversations, public.conversation_participants, public.messages to authenticated;
grant insert (id, name, program, bio, avatar, skills), update (name, program, bio, avatar, skills) on public.profiles to authenticated;
grant insert (author_id, title, description, category, type, availability, location), update (title, description, category, type, availability, location), delete on public.posts to authenticated;
grant insert (conversation_id, sender_id, content) on public.messages to authenticated;

create policy profile_read on public.profiles for select to authenticated using (private.is_student());
create policy profile_create on public.profiles for insert to authenticated with check (private.is_student() and id = auth.uid());
create policy profile_edit on public.profiles for update to authenticated using (private.is_student() and id = auth.uid()) with check (id = auth.uid());
create policy post_read on public.posts for select to authenticated using (private.is_student());
create policy post_create on public.posts for insert to authenticated with check (private.is_student() and author_id = auth.uid());
create policy post_edit on public.posts for update to authenticated using (private.is_student() and author_id = auth.uid()) with check (author_id = auth.uid());
create policy post_delete on public.posts for delete to authenticated using (private.is_student() and author_id = auth.uid());
create policy conversation_read on public.conversations for select to authenticated using (private.is_student() and private.is_participant(id));
create policy participant_read on public.conversation_participants for select to authenticated using (private.is_student() and private.is_participant(conversation_id));
create policy message_read on public.messages for select to authenticated using (private.is_student() and private.is_participant(conversation_id));
create policy message_send on public.messages for insert to authenticated with check (private.is_student() and private.is_participant(conversation_id) and sender_id = auth.uid());

-- Membership is created atomically through this RPC; clients cannot insert arbitrary memberships.
create function public.create_conversation(other_user_id uuid, post_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare conversation_id uuid; caller uuid := auth.uid();
begin
  if not private.is_student() then raise exception 'Confirmed Waterloo account required' using errcode = '42501'; end if;
  if other_user_id = caller or not exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id where p.id = other_user_id
    and u.email_confirmed_at is not null and lower(split_part(u.email, '@', 2)) = 'uwaterloo.ca'
  ) then raise exception 'Invalid participant' using errcode = '22023'; end if;
  if not exists(select 1 from public.profiles where id = caller) then raise exception 'Create your profile first'; end if;
  if post_id is not null and not exists(select 1 from public.posts where id = post_id and author_id in (caller, other_user_id)) then
    raise exception 'Post must belong to a participant' using errcode = '22023';
  end if;
  insert into public.conversations(related_post_id) values (post_id) returning id into conversation_id;
  insert into public.conversation_participants values (conversation_id, caller), (conversation_id, other_user_id);
  return conversation_id;
end;
$$;
revoke all on function public.create_conversation(uuid, uuid) from public, anon;
grant execute on function public.create_conversation(uuid, uuid) to authenticated;
commit;
