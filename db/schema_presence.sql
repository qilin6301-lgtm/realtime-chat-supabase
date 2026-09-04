-- presence table for tracking online users per room
create table if not exists presence (
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  last_seen timestamptz default now(),
  primary key (room_id, user_id)
);

create index if not exists idx_presence_room on presence(room_id);
create index if not exists idx_presence_user on presence(user_id);
