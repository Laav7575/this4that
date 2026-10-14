-- DEVELOPMENT ONLY: run manually in this4that-dev SQL Editor, after the migration.
-- A=Maya, B=Jordan, C=Aisha. Fictional profile names will be attached to these test accounts.
-- Does not create/change Auth users or confirmation status. Existing profiles are preserved.
-- Stable IDs and ON CONFLICT DO NOTHING make reruns non-destructive.
begin;
create temporary table seed_accounts (alias text primary key, user_id uuid unique not null) on commit drop;
insert into seed_accounts values
('maya','64ef8769-cd31-44f6-a56b-d1b5d8a73eac'),
('jordan','59e84f45-effd-4d3e-8d5c-7d3dcdc63e72'),
('aisha','05df20ed-5d3b-4fdc-9f29-dc7a0d71d5f0');
do $$
begin
  if (select count(*) from seed_accounts s join auth.users u on u.id=s.user_id) <> 3 then
    raise exception 'All three test accounts must exist in Authentication → Users';
  end if;
  if exists(select 1 from seed_accounts s join auth.users u on u.id=s.user_id
    where u.email_confirmed_at is null or u.email is null or lower(split_part(u.email,'@',2)) <> 'uwaterloo.ca') then
    raise exception 'Each test account must have a confirmed @uwaterloo.ca email; this seed does not bypass verification';
  end if;
end;
$$;

insert into public.profiles (id,name,program,bio,avatar,skills) values
('64ef8769-cd31-44f6-a56b-d1b5d8a73eac','Maya Chen','Mathematics','Happy to trade calculus help for practical favours.',null,ARRAY['Calculus','Meal prep']),
('59e84f45-effd-4d3e-8d5c-7d3dcdc63e72','Jordan Patel','Computer Science','Python enthusiast and weekend cyclist.',null,ARRAY['Python','Technology support']),
('05df20ed-5d3b-4fdc-9f29-dc7a0d71d5f0','Aisha Rahman','Engineering','I enjoy helping neighbours and looking after pets.',null,ARRAY['Pet sitting','Moving'])
on conflict do nothing;

insert into public.posts (id,author_id,title,description,category,type,availability,location,created_at) values
('05fff3e3-31b8-4422-a160-faf06383cd0d','64ef8769-cd31-44f6-a56b-d1b5d8a73eac','Calculus tutoring','Review limits and derivatives together at Dana Porter.','Tutoring','Offer','Weekday afternoons','Dana Porter Library','2026-10-10T14:00:00Z'),
('09551c98-addb-4834-a962-63d10e9dff8a','59e84f45-effd-4d3e-8d5c-7d3dcdc63e72','Python programming help','Help debugging your first Python project.','Technology','Offer','Tuesday evening','DC Library','2026-10-10T15:00:00Z'),
('9a6fb0c8-89a2-4080-ad75-b26afac7ddd9','64ef8769-cd31-44f6-a56b-d1b5d8a73eac','Grocery pickup','Could someone pick up a few essentials on their way home?','Errands','Request','Sunday afternoon','Uptown Waterloo','2026-10-10T16:00:00Z'),
('754deef3-47ff-4c91-a1f8-8bcd821e5d05','59e84f45-effd-4d3e-8d5c-7d3dcdc63e72','Moving assistance','Need an extra pair of hands to carry a small desk.','Moving','Request','Saturday at 2 PM','University Avenue','2026-10-10T17:00:00Z'),
('f9493a68-88d5-4990-a1a2-68a36fbf0a08','05df20ed-5d3b-4fdc-9f29-dc7a0d71d5f0','Pet sitting','Happy to watch your cat while you visit home.','Pets','Offer','Weekends','Lakeshore','2026-10-10T18:00:00Z'),
('d76f0543-6daf-4e86-ab17-8f3ebf18148f','05df20ed-5d3b-4fdc-9f29-dc7a0d71d5f0','Technology support','Looking for help setting up my laptop backup.','Technology','Request','Monday evening','SLC','2026-10-10T19:00:00Z')
on conflict do nothing;

insert into public.conversations (id,related_post_id) values
('50b09b99-2122-4e77-a8a8-f22206f851cb','754deef3-47ff-4c91-a1f8-8bcd821e5d05'),
('8bffbfc3-d2f9-468a-abfe-0ad0dfe7395b','f9493a68-88d5-4990-a1a2-68a36fbf0a08')
on conflict do nothing;

insert into public.conversation_participants (conversation_id,user_id) values
('50b09b99-2122-4e77-a8a8-f22206f851cb','64ef8769-cd31-44f6-a56b-d1b5d8a73eac'),
('50b09b99-2122-4e77-a8a8-f22206f851cb','59e84f45-effd-4d3e-8d5c-7d3dcdc63e72'),
('8bffbfc3-d2f9-468a-abfe-0ad0dfe7395b','64ef8769-cd31-44f6-a56b-d1b5d8a73eac'),
('8bffbfc3-d2f9-468a-abfe-0ad0dfe7395b','05df20ed-5d3b-4fdc-9f29-dc7a0d71d5f0')
on conflict do nothing;

insert into public.messages (id,conversation_id,sender_id,content,timestamp) values
('5df34dec-399b-487d-af58-98b2c84858f3','50b09b99-2122-4e77-a8a8-f22206f851cb','64ef8769-cd31-44f6-a56b-d1b5d8a73eac','I can help with the desk on Saturday.','2026-10-10T20:00:00Z'),
('8ed04382-9e60-4764-a424-9281ae0801fd','50b09b99-2122-4e77-a8a8-f22206f851cb','59e84f45-effd-4d3e-8d5c-7d3dcdc63e72','Thanks! Saturday at 2 works.','2026-10-10T20:05:00Z'),
('f50421fe-2377-4212-aaac-1083c0cc28ce','8bffbfc3-d2f9-468a-abfe-0ad0dfe7395b','64ef8769-cd31-44f6-a56b-d1b5d8a73eac','Are you available to watch my cat next weekend?','2026-10-10T21:00:00Z')
on conflict do nothing;

commit;
