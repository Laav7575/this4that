begin;

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- Single combined trigram index on raw text (no lower()).
create index posts_search_trgm on public.posts
  using gin (
    (coalesce(title,'') || ' ' || coalesce(description,'') || ' ' ||
     coalesce(category,'') || ' ' || coalesce(location,'')) extensions.gin_trgm_ops
  );

create index posts_location_trgm on public.posts
  using gin (location extensions.gin_trgm_ops);

create function public.search_posts(
  p_offset integer,
  p_limit integer,
  p_category text,
  p_type text,
  p_search text,
  p_location text,
  p_created_after timestamptz
) returns setof public.posts
language sql stable set search_path = ''
as $$
  select post.*
  from public.posts as post
  where (p_category is null or post.category = p_category)
    and (p_type is null or post.type = p_type)
    and (p_created_after is null or post.created_at >= p_created_after)
    and (
      nullif(btrim(p_search), '') is null
      or (coalesce(post.title,'') || ' ' || coalesce(post.description,'') || ' ' ||
          coalesce(post.category,'') || ' ' || coalesce(post.location,''))
         ilike '%' || replace(replace(replace(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
    and (
      nullif(btrim(p_location), '') is null
      or post.location ilike '%' || replace(replace(replace(btrim(p_location), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
  order by post.created_at desc, post.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.search_posts(integer, integer, text, text, text, text, timestamptz) from public, anon;
grant execute on function public.search_posts(integer, integer, text, text, text, text, timestamptz) to authenticated;

commit;