begin;

alter table public.posts
  add column location_search_document tsvector generated always as (
    to_tsvector('english', coalesce(location, ''))
  ) stored;

create index posts_location_search_document on public.posts using gin (location_search_document);

commit;
