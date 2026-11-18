alter table public.posts
  add constraint posts_availability_max_length
    check (char_length(availability) <= 60) not valid,
  add constraint posts_location_max_length
    check (char_length(location) <= 60) not valid;
