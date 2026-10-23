-- Reopening a chat from a different post switches its exchange card and adds a notice to the thread (one chat per student pair).
begin;
-- Notices reference the post they introduce. Students cannot set this column: their insert grant excludes it.
alter table public.messages add column if not exists post_id uuid references public.posts(id) on delete set null;
create or replace function public.create_conversation(other_user_id uuid, post_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare conversation_id uuid; caller uuid := auth.uid(); current_post uuid; post_title text; previous_title text;
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
  -- Serialize both directions of the pair, including requests from separate devices.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    least(caller, other_user_id)::text || ':' || greatest(caller, other_user_id)::text, 0));
  select c.id into conversation_id from public.conversations c
  where exists (select 1 from public.conversation_participants p where p.conversation_id = c.id and p.user_id = caller)
    and exists (select 1 from public.conversation_participants p where p.conversation_id = c.id and p.user_id = other_user_id)
    and (select count(*) from public.conversation_participants p where p.conversation_id = c.id) = 2
  order by c.created_at, c.id limit 1;
  if conversation_id is not null then
    -- Same chat, new post: switch the exchange card and leave a notice saying what changed.
    if post_id is not null then
      select c.related_post_id into current_post from public.conversations c where c.id = conversation_id;
      if current_post is distinct from post_id then
        select p.title into post_title from public.posts p where p.id = post_id;
        select p.title into previous_title from public.posts p where p.id = current_post;
        update public.conversations c set related_post_id = post_id where c.id = conversation_id;
        insert into public.messages(conversation_id, sender_id, content, post_id)
        values (conversation_id, caller, 'Now talking about “' || post_title || '”'
          || coalesce(E'\nPreviously: “' || previous_title || '”', ''), post_id);
      end if;
    end if;
    return conversation_id;
  end if;
  insert into public.conversations(related_post_id) values (post_id) returning id into conversation_id;
  insert into public.conversation_participants values (conversation_id, caller), (conversation_id, other_user_id);
  return conversation_id;
end;
$$;
revoke all on function public.create_conversation(uuid, uuid) from public, anon;
grant execute on function public.create_conversation(uuid, uuid) to authenticated;
commit;
