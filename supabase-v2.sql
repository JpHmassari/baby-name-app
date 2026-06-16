create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  couple_code text not null,
  partner_name text,
  liked_names text[] default '{}',
  loved_names text[] default '{}',
  disliked_names text[] default '{}'
);

alter table profiles enable row level security;

drop policy if exists "profiles read all" on profiles;
drop policy if exists "profiles insert all" on profiles;
drop policy if exists "profiles update all" on profiles;

create policy "profiles read all"
on profiles
for select
to anon
using (true);

create policy "profiles insert all"
on profiles
for insert
to anon
with check (true);

create policy "profiles update all"
on profiles
for update
to anon
using (true)
with check (true);
