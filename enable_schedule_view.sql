-- Run this in your Supabase SQL Editor to enable team-wide schedule viewing

-- 1. Drop the policy if it exists (to avoid errors if you run this multiple times)
drop policy if exists "Members can read all published shifts" on public.shifts;

-- 2. Create the policy
create policy "Members can read all published shifts"
  on public.shifts for select
  using ( status = 'published' );

-- 3. Verify it's created
select * from pg_policies where tablename = 'shifts';
