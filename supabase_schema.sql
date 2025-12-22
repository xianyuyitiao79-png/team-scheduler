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
  role text not null check (role in ('admin', 'member')) default 'admin',
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
  user_id uuid references public.profiles(id) on delete cascade not null,
  start_time text,
  end_time text,
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

-- OPERATING HOURS
create table public.operating_hours (
  id uuid default uuid_generate_v4() primary key,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0=Sunday, 1=Monday...
  start_time text not null default '09:00',
  end_time text not null default '21:00',
  is_closed boolean default false,
  unique(day_of_week)
);

-- Insert default operating hours (Mon-Sun)
-- UPDATED DEFAULT TO 10:00 - 18:00 as requested
insert into public.operating_hours (day_of_week, start_time, end_time)
values 
  (0, '10:00', '18:00'),
  (1, '10:00', '18:00'),
  (2, '10:00', '18:00'),
  (3, '10:00', '18:00'),
  (4, '10:00', '18:00'),
  (5, '10:00', '18:00'),
  (6, '10:00', '18:00')
on conflict (day_of_week) do nothing;

-- ENABLE RLS for operating_hours
alter table public.operating_hours enable row level security;

-- POLICIES for operating_hours
-- Everyone can read
create policy "Everyone can read operating hours"
  on public.operating_hours for select
  using ( true );

-- Admins can update
create policy "Admins can update operating hours"
  on public.operating_hours for all
  using ( auth.uid() in ( select id from public.profiles where role = 'admin' ) );

-- SPECIAL OPERATING HOURS
create table public.special_operating_hours (
  id uuid default uuid_generate_v4() primary key,
  specific_date date not null unique,
  start_time text not null,
  end_time text not null,
  is_closed boolean default false,
  reason text
);

-- ENABLE RLS for special_operating_hours
alter table public.special_operating_hours enable row level security;

-- POLICIES for special_operating_hours
create policy "Everyone can read special operating hours"
  on public.special_operating_hours for select
  using ( true );

create policy "Admins can manage special operating hours"
  on public.special_operating_hours for all
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
