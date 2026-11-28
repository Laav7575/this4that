begin;

-- Store normalized terms so a term matches whole words, regardless of case or punctuation.
create function private.normalize_post_language(value text) returns text
language sql immutable strict set search_path = '' as $$
  select btrim(regexp_replace(lower(normalize(value, NFKC)), '[^[:alnum:]]+', ' ', 'g'));
$$;

create table private.post_blocked_terms (
  term text not null,
  normalized_term text generated always as (private.normalize_post_language(term)) stored primary key,
  check (normalized_term <> '')
);
revoke all on private.post_blocked_terms from public, anon, authenticated;

-- Starter terms for campus exchanges. Keep broad topics such as tutoring and payment
-- out of the list because they can appear in legitimate posts.
insert into private.post_blocked_terms (term) values
  -- Strong profanity and targeted abuse
  ('fuck'),
  ('fucking'),
  ('fucked'),
  ('fucker'),
  ('motherfucker'),
  ('bullshit'),
  ('shithead'),
  ('asshole'),
  ('kill yourself'),
  ('go die'),
  -- Sexual solicitation
  ('sex for cash'),
  ('sex for money'),
  ('paid sex'),
  ('sexual favors'),
  ('escort services'),
  ('sell nudes'),
  ('buy nudes'),
  -- Academic misconduct
  ('write my essay'),
  ('write your essay for you'),
  ('do my homework'),
  ('do your homework for you'),
  ('take my exam'),
  ('take your exam for you'),
  ('buy exam answers'),
  ('sell exam answers'),
  -- Fraud and unsafe transactions
  ('fake student id'),
  ('fake transcript'),
  ('fake diploma'),
  ('stolen credit card'),
  ('buy stolen accounts'),
  ('buy cocaine'),
  ('sell cocaine'),
  ('buy fentanyl'),
  ('sell fentanyl'),
  ('buy stolen guns'),
  ('sell stolen guns'),
  ('pay an upfront fee'),
  ('send gift card codes');

create function private.post_language_allowed(variadic fields text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1
    from unnest(fields) as field(value)
    cross join private.post_blocked_terms as blocked
    where strpos(' ' || private.normalize_post_language(field.value) || ' ',
                 ' ' || blocked.normalized_term || ' ') > 0
  );
$$;
revoke all on function private.post_language_allowed(text[]) from public, anon;
grant execute on function private.post_language_allowed(text[]) to authenticated;

-- Existing posts are filtered as soon as the blocked terms change.
create policy post_language_visibility on public.posts
  as restrictive for select to authenticated
  using (private.post_language_allowed(title, description, category, availability, location));

create function private.check_post_language() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not private.post_language_allowed(new.title, new.description, new.category, new.availability, new.location) then
    raise exception 'Revise the language in your post and try again.' using errcode = 'P4060';
  end if;
  return new;
end;
$$;
revoke all on function private.check_post_language() from public, anon, authenticated;

create trigger posts_check_language
  before insert or update of title, description, category, availability, location on public.posts
  for each row execute function private.check_post_language();

create or replace function public.set_post_completed(target_id uuid, completed boolean) returns public.posts
language plpgsql security definer set search_path = '' as $$
declare result public.posts;
begin
  if not private.is_student() then raise exception 'Confirmed Waterloo account required' using errcode = '42501'; end if;
  if completed is null then raise exception 'Choose a completion status' using errcode = '22023'; end if;
  update public.posts set completed_at = case when completed then coalesce(completed_at, now()) else null end
    where id = target_id and author_id = auth.uid() and private.post_language_allowed(title, description, category, availability, location)
    returning * into result;
  if not found then raise exception 'Only the owner of an available post can change its status' using errcode = '42501'; end if;
  return result;
end;
$$;

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
  if post_id is not null then
    select p.title into post_title from public.posts p
      where p.id = post_id and p.author_id in (caller, other_user_id)
        and private.post_language_allowed(p.title, p.description, p.category, p.availability, p.location)
      for share;
    if not found then
      raise exception 'Post must be available and belong to a participant' using errcode = '22023';
    end if;
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
        select p.title into previous_title from public.posts p where p.id = current_post and private.post_language_allowed(p.title, p.description, p.category, p.availability, p.location);
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

commit;
