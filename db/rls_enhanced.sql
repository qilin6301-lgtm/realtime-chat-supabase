-- Enhanced RLS for private rooms and membership

-- Enable RLS on rooms_members
alter table if exists rooms_members enable row level security;

-- Rooms: select if public OR user is a member
create policy "rooms_select_public_or_member" on rooms
  for select using (
    auth.role() = 'authenticated' and (
      is_public = true
      OR
      exists(select 1 from rooms_members m where m.room_id = rooms.id and m.user_id = auth.uid())
    )
  );

-- Rooms: allow insert only when created_by == auth.uid()
create policy "rooms_insert_authenticated" on rooms
  for insert with check (auth.role() = 'authenticated' and created_by = auth.uid());

-- Rooms: allow update/delete only to room creator
create policy "rooms_update_owner_only" on rooms
  for update using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "rooms_delete_owner_only" on rooms
  for delete using (created_by = auth.uid());

-- Rooms_members: allow user to insert their own membership (self-join) or allow room owner to add members
create policy "rooms_members_insert_self_or_owner" on rooms_members
  for insert with check (
    auth.role() = 'authenticated' and (
      user_id = auth.uid() OR exists(select 1 from rooms r where r.id = rooms_members.room_id and r.created_by = auth.uid())
    )
  );

-- Rooms_members: allow select only to members of the room
create policy "rooms_members_select_member" on rooms_members
  for select using (auth.role() = 'authenticated' and exists(select 1 from rooms_members m where m.room_id = rooms_members.room_id and m.user_id = auth.uid()));

-- Rooms_members: allow delete only to room owner or the member themself
create policy "rooms_members_delete_self_or_owner" on rooms_members
  for delete using (
    auth.role() = 'authenticated' and (
      user_id = auth.uid() OR exists(select 1 from rooms r where r.id = rooms_members.room_id and r.created_by = auth.uid())
    )
  );

-- Messages: select if room is public OR user is member
create policy "messages_select_public_or_member" on messages
  for select using (
    auth.role() = 'authenticated' and (
      exists(select 1 from rooms r where r.id = messages.room_id and r.is_public = true)
      OR exists(select 1 from rooms_members m where m.room_id = messages.room_id and m.user_id = auth.uid())
    )
  );

-- Messages: insert allowed when author == auth.uid() and (room is public OR user is member)
create policy "messages_insert_member_or_public" on messages
  for insert with check (
    auth.role() = 'authenticated' and author = auth.uid() and (
      exists(select 1 from rooms r where r.id = messages.room_id and r.is_public = true)
      OR exists(select 1 from rooms_members m where m.room_id = messages.room_id and m.user_id = auth.uid())
    )
  );

-- Messages: allow delete/update only to message author
create policy "messages_modify_author_only" on messages
  for update using (author = auth.uid()) with check (author = auth.uid());
create policy "messages_delete_author_only" on messages
  for delete using (author = auth.uid());

-- Note: You should review and adjust these policies according to your application logic.
