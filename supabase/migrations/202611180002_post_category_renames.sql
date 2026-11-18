update public.posts
set category = case category
  when 'Tutoring' then 'Academic'
  when 'Academic and Career Help' then 'Academic'
  when 'Moving' then 'Household'
  when 'Household Help' then 'Household'
  when 'Handy help' then 'Creative'
  when 'Arts & Crafts' then 'Creative'
  else category
end
where category in (
  'Tutoring', 'Academic and Career Help',
  'Moving', 'Household Help',
  'Handy help', 'Arts & Crafts'
);
