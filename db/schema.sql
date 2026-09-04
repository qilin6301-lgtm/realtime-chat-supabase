-- Schema for realtime-chat-supabase

-- extensions
create extension if not exists pgcrypto;

-- profiles (linked to auth.users.id)
create table if not exists profiles (
  id uuid primary key,
  username text,
  avatar_url text,
  created_at timestamptz default now()
);

-- rooms
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text,
  is_public boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) not null,
  author uuid references profiles(id) not null,
  content text,
  attachments jsonb,
  created_at timestamptz default now()
);

-- verification codes for email sign-up
create table if not exists verification_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  purpose text not null default 'signup',
  attempts int default 0,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

create index if not exists idx_verification_email on verification_codes(email);
