-- Simple RLS examples (you should review and adapt before production)

-- Enable RLS on messages and rooms
alter table if exists messages enable row level security;
alter table if exists rooms enable row level security;

-- Allow authenticated users to select messages (read public rooms)
create policy "allow_select_authenticated" on messages
  for select using (auth.role() = 'authenticated');

-- Allow authenticated users to insert messages but author must match auth.uid()
create policy "allow_insert_authenticated" on messages
  for insert with check (auth.role() = 'authenticated' and author = auth.uid());

-- Rooms: allow authenticated users to select
create policy "rooms_select_authenticated" on rooms
  for select using (auth.role() = 'authenticated');

-- Note: For private rooms and membership you'll need additional tables and policies.
