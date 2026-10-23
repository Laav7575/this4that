begin;
-- Block writes while merging histories so no message can be lost during the migration.
lock table public.conversations, public.conversation_participants, public.messages in share row exclusive mode;
create temporary table conversation_merges on commit drop as
with pairs as (
  select c.id, c.created_at, array_agg(p.user_id order by p.user_id) as members
  from public.conversations c join public.conversation_participants p on p.conversation_id = c.id
  group by c.id having count(*) = 2
), ranked as (
  select id, first_value(id) over (partition by members order by created_at, id) as keeper
  from pairs
)
select id, keeper from ranked where id <> keeper;
-- Keep message IDs, senders and timestamps; only their containing conversation changes.
update public.messages m set conversation_id = d.keeper
from conversation_merges d where m.conversation_id = d.id;
delete from public.conversations c using conversation_merges d where c.id = d.id;

create or replace function public.create_conversation(other_user_id uuid, post_id uuid default null) returns uuid
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
  -- Serialize both directions of the pair, including requests from separate devices.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    least(caller, other_user_id)::text || ':' || greatest(caller, other_user_id)::text, 0));
  select c.id into conversation_id from public.conversations c
  where exists (select 1 from public.conversation_participants p where p.conversation_id = c.id and p.user_id = caller)
    and exists (select 1 from public.conversation_participants p where p.conversation_id = c.id and p.user_id = other_user_id)
    and (select count(*) from public.conversation_participants p where p.conversation_id = c.id) = 2
  order by c.created_at, c.id limit 1;
  if conversation_id is not null then return conversation_id; end if;
  insert into public.conversations(related_post_id) values (post_id) returning id into conversation_id;
  insert into public.conversation_participants values (conversation_id, caller), (conversation_id, other_user_id);
  return conversation_id;
end;
$$;
revoke all on function public.create_conversation(uuid, uuid) from public, anon;
grant execute on function public.create_conversation(uuid, uuid) to authenticated;
commit;
