-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- CLEANUP (CAREFUL: This deletes all data!)
drop table if exists public.shifts cascade;
drop table if exists public.shift_templates cascade;
drop table if exists public.profiles cascade;
drop table if exists public.settings cascade;
drop function if exists public.handle_new_user() cascade;

-- PROFILES
create table public.profiles (
  id uuid references auth.users not null primary key,
  name text not null,
  role text not null check (role in ('admin', 'member')) default 'member',
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SHIFT TEMPLATES
create table public.shift_templates (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  start_time time not null,
  end_time time not null,
  break_minutes integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SHIFTS
create table public.shifts (
  id uuid default uuid_generate_v4() primary key,
  date date not null,
  template_id uuid references public.shift_templates(id),
  user_id uuid references public.profiles(id) not null,
  status text not null check (status in ('draft', 'published')) default 'draft',
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SETTINGS (Singleton)
create table public.settings (
  id integer primary key check (id = 1),
  team_name text default 'My Team',
  timezone text default 'UTC'
);

-- Insert default settings
insert into public.settings (id, team_name, timezone) values (1, 'My Team', 'UTC') on conflict do nothing;

-- ENABLE RLS
alter table public.profiles enable row level security;
alter table public.shift_templates enable row level security;
alter table public.shifts enable row level security;
alter table public.settings enable row level security;

-- POLICIES

-- Profiles
-- Admins can do everything
create policy "Admins can do everything on profiles"
  on public.profiles for all
  using ( auth.uid() in ( select id from public.profiles where role = 'admin' ) );

-- Everyone can read profiles (needed to see names on schedule)
create policy "Everyone can read profiles"
  on public.profiles for select
  using ( true );

-- Users can update own profile (optional, maybe just name)
create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Shift Templates
-- Admins can do everything
create policy "Admins can manage templates"
  on public.shift_templates for all
  using ( auth.uid() in ( select id from public.profiles where role = 'admin' ) );

-- Everyone can read templates
create policy "Everyone can read templates"
  on public.shift_templates for select
  using ( true );

-- Shifts
-- Admins can do everything
create policy "Admins can manage shifts"
  on public.shifts for all
  using ( auth.uid() in ( select id from public.profiles where role = 'admin' ) );

-- Members can read OWN shifts
create policy "Members can read own shifts"
  on public.shifts for select
  using ( auth.uid() = user_id );

-- OPTIONAL: If you want members to see the whole team's PUBLISHED schedule, uncomment this:
-- create policy "Members can read all published shifts"
--   on public.shifts for select
--   using ( status = 'published' );

-- Settings
create policy "Everyone can read settings"
  on public.settings for select
  using ( true );

create policy "Admins can update settings"
  on public.settings for update
  using ( auth.uid() in ( select id from public.profiles where role = 'admin' ) );

-- TRIGGER to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role, active)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'User'), 
    'member', 
    true
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
