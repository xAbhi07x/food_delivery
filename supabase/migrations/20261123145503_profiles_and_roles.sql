-- Phase 2: identity foundation. Roles and profiles, with RLS and locked-down privileges.
-- See docs/decisions.md (D-02) and SRS section 3 and 4.1.

create type public.user_role as enum ('CUSTOMER', 'RIDER', 'ADMIN');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  -- E.164, e.g. +919876543210. Null for email-only accounts (admins).
  phone text,
  role public.user_role not null default 'CUSTOMER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_phone_format check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  constraint profiles_full_name_length check (full_name is null or char_length(full_name) between 1 and 100)
);

create unique index profiles_phone_key on public.profiles (phone) where phone is not null;

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Every new auth user gets a CUSTOMER profile. The role is never read from signup
-- metadata (raw_user_meta_data is client-controlled). Riders and admins are promoted
-- afterwards by a privileged server-side step.
create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, phone)
  values (
    new.id,
    case when coalesce(new.phone, '') = '' then null else '+' || new.phone end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role lookup for RLS policies. SECURITY DEFINER so it can read profiles without
-- recursing into the profiles policies. Returns null when there is no signed-in user.
create function public.current_user_role() returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

alter table public.profiles enable row level security;

-- Default deny: remove the broad API grants, then add back only what is needed.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
-- Column-level grant: users can edit their name but never role, phone or id.
grant update (full_name) on table public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_select_admin on public.profiles
  for select to authenticated
  using ((select public.current_user_role()) = 'ADMIN');

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.current_user_role() from public, anon;
grant execute on function public.current_user_role() to authenticated;
