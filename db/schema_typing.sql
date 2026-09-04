-- typing table for short-lived typing indicators
create table if not exists typing (
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  expires_at timestamptz not null,
  primary key (room_id, user_id)
);

create index if not exists idx_typing_room on typing(room_id);
