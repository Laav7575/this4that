   -- Profile additions: signup date for "Member since", and an optional free-text location

   alter table public.profiles
     add column if not exists created_at timestamptz not null default now();

   -- Give existing profiles their real signup date instead of today
   update public.profiles p
   set created_at = u.created_at
   from auth.users u
   where u.id = p.id;

   alter table public.profiles
     add column if not exists location text not null default '' check (char_length(location) <= 100);

   grant insert (location), update (location) on public.profiles to authenticated;