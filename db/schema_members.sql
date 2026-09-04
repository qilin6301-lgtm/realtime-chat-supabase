-- rooms_members table: maps users to rooms with roles
create table if not exists rooms_members (
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member',
  created_at timestamptz default now(),
  primary key (room_id, user_id)
);

create index if not exists idx_rooms_members_user on rooms_members(user_id);
create index if not exists idx_rooms_members_room on rooms_members(room_id);
