begin;

create table public.terms_acceptances (
  user_id uuid not null references public.profiles(id) on delete cascade,
  terms_version text not null check (char_length(terms_version) between 1 and 100),
  accepted_at timestamptz not null default now(),
  primary key (user_id, terms_version)
);

alter table public.terms_acceptances enable row level security;
revoke all on public.terms_acceptances from public, anon, authenticated;
grant select on public.terms_acceptances to authenticated;
grant insert (user_id, terms_version) on public.terms_acceptances to authenticated;

create policy terms_acceptance_read on public.terms_acceptances for select to authenticated
  using (private.is_student() and user_id = (select auth.uid()));
create policy terms_acceptance_insert on public.terms_acceptances for insert to authenticated
  with check (private.is_student() and user_id = (select auth.uid()));

commit;
