begin;

alter table public.posts
  add column search_document tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(location, '')), 'C')
  ) stored;

create index posts_search_document on public.posts using gin (search_document);
create index posts_category_feed on public.posts (category, created_at desc, id desc);
create index posts_type_feed on public.posts (type, created_at desc, id desc);

create function public.get_post_categories() returns table(category text)
language sql stable set search_path = ''
as $$
  select distinct p.category
  from public.posts as p
  order by p.category;
$$;

revoke all on function public.get_post_categories() from public, anon;
grant execute on function public.get_post_categories() to authenticated;

commit;
