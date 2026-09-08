-- ==============================================================================
-- StatementToExcel - Supabase Initial Schema Migration
-- ==============================================================================
-- Run this in your Supabase Project's SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. Profiles Table (Linked to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text not null,
  credits_remaining int not null default 3,
  is_pro boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Conversions History Table
create table if not exists public.conversions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  file_name text not null,
  page_count int not null default 1,
  extracted_data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Lemon Squeezy Payments & Webhooks Ledger Table
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  order_id text unique not null,
  amount text not null,
  status text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- Row-Level Security (RLS) Configuration
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.conversions enable row level security;
alter table public.payments enable row level security;

-- Profiles Policies
create policy "Users can view their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- Conversions Policies
create policy "Users can view their own conversions"
  on public.conversions
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own conversions"
  on public.conversions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own conversions"
  on public.conversions
  for delete
  using (auth.uid() = user_id);

-- Payments Policies (Users can only view their own payment receipts; Webhook updates via service role)
create policy "Users can view their own payments"
  on public.payments
  for select
  using (auth.uid() = user_id);

-- ==============================================================================
-- Automatic User Profile Creation Trigger
-- When a user signs up via Google OAuth or Magic Link, create a profile with 3 free credits
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, credits_remaining, is_pro)
  values (
    new.id,
    coalesce(new.email, ''),
    3,
    false
  )
  on conflict (id) do update
  set email = excluded.email;
  return new;
end;
$$;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Indexing for high-traffic queries
create index if not exists idx_conversions_user_id on public.conversions(user_id);
create index if not exists idx_conversions_created_at on public.conversions(created_at desc);
create index if not exists idx_payments_user_id on public.payments(user_id);
