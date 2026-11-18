begin;
alter table public.posts add column completed_at timestamptz;
alter table public.conversations add column closed_at timestamptz;

-- Status writes go through authorized RPCs, not client-supplied timestamps.
create function public.set_post_completed(target_id uuid, completed boolean) returns public.posts
language plpgsql security definer set search_path = '' as $$
declare result public.posts;
begin
  if not private.is_student() then raise exception 'Confirmed Waterloo account required' using errcode = '42501'; end if;
  if completed is null then raise exception 'Choose a completion status' using errcode = '22023'; end if;
  update public.posts set completed_at = case when completed then coalesce(completed_at, now()) else null end
    where id = target_id and author_id = auth.uid() returning * into result;
  if not found then raise exception 'Only the post owner can change its status' using errcode = '42501'; end if;
  return result;
end;
$$;

create function public.set_conversation_closed(target_id uuid, closed boolean) returns public.conversations
language plpgsql security definer set search_path = '' as $$
declare result public.conversations;
begin
  if not private.is_student() or not private.is_participant(target_id) then
    raise exception 'Conversation unavailable' using errcode = '42501';
  end if;
  if closed is null then raise exception 'Choose a conversation status' using errcode = '22023'; end if;
  update public.conversations set closed_at = case when closed then coalesce(closed_at, now()) else null end
    where id = target_id returning * into result;
  return result;
end;
$$;

-- Serialize sends with closure so a stale client cannot send to a closed chat.
-- Context notices from create_conversation remain allowed; they never reopen it.
create function private.require_open_conversation() returns trigger
language plpgsql security definer set search_path = '' as $$
declare closed timestamptz;
begin
  select closed_at into closed from public.conversations where id = new.conversation_id for update;
  if closed is not null and new.post_id is null then
    raise exception 'Reopen this conversation before sending a message.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger messages_require_open before insert on public.messages
  for each row execute function private.require_open_conversation();
revoke all on function private.require_open_conversation() from public, anon, authenticated;
revoke all on function public.set_post_completed(uuid, boolean), public.set_conversation_closed(uuid, boolean) from public, anon;
grant execute on function public.set_post_completed(uuid, boolean), public.set_conversation_closed(uuid, boolean) to authenticated;
commit;
