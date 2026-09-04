-- idempotency for messages: add client_msg_id to avoid duplicates
alter table if exists messages add column if not exists client_msg_id text;

-- create unique index to ensure idempotent inserts per room
create unique index if not exists idx_messages_room_clientid on messages(room_id, client_msg_id) where client_msg_id is not null;
