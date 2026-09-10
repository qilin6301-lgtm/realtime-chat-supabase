-- 生产安全迁移：请在 Supabase SQL Editor 中以一次迁移执行。
-- 该脚本收紧客户端权限，并将送礼流程放入数据库事务。

alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists updated_at timestamptz default now();
alter table public.messages add column if not exists client_request_id uuid;
alter table public.messages add column if not exists deleted_at timestamptz;
create unique index if not exists messages_sender_request_uidx
  on public.messages(sender_id, client_request_id) where client_request_id is not null;
create index if not exists messages_conversation_created_idx
  on public.messages(conversation_id, created_at desc);
create index if not exists conversations_user1_last_message_idx
  on public.conversations(user1_id, last_message_at desc);
create index if not exists conversations_user2_last_message_idx
  on public.conversations(user2_id, last_message_at desc);

-- 防止普通用户通过 profiles update 修改管理员、余额、审核和设备字段。
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    new.is_admin := old.is_admin;
    new.is_approved := old.is_approved;
    new.balance := old.balance;
    new.max_devices := old.max_devices;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists protect_profile_fields_trigger on public.profiles;
create trigger protect_profile_fields_trigger
before update on public.profiles
for each row execute function public.protect_profile_fields();

create or replace function public.protect_message_fields()
returns trigger
language plpgsql
as $$
begin
  new.id := old.id;
  new.conversation_id := old.conversation_id;
  new.sender_id := old.sender_id;
  new.msg_type := old.msg_type;
  new.gift_id := old.gift_id;
  new.client_request_id := old.client_request_id;
  new.created_at := old.created_at;
  return new;
end;
$$;
drop trigger if exists protect_message_fields_trigger on public.messages;
create trigger protect_message_fields_trigger
before update on public.messages
for each row execute function public.protect_message_fields();

-- 删除旧的宽松策略。
drop policy if exists profiles_all on public.profiles;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists sessions_own on public.user_sessions;
drop policy if exists sessions_admin on public.user_sessions;
drop policy if exists conversations_all on public.conversations;
drop policy if exists conv_own on public.conversations;
drop policy if exists messages_select on public.messages;
drop policy if exists messages_insert on public.messages;
drop policy if exists messages_update on public.messages;
drop policy if exists msg_own on public.messages;
drop policy if exists likes_all on public.message_likes;
drop policy if exists friendships_select on public.friendships;
drop policy if exists friendships_insert on public.friendships;
drop policy if exists friendships_delete on public.friendships;
drop policy if exists friends_own on public.friendships;
drop policy if exists gifts_select on public.gifts;
drop policy if exists gifts_read on public.gifts;
drop policy if exists gifts_write_admin on public.gifts;
drop policy if exists gifts_admin on public.gifts;
drop policy if exists invite_select on public.invite_codes;
drop policy if exists invite_all on public.invite_codes;
drop policy if exists invite_write_admin on public.invite_codes;
drop policy if exists gift_sends_own on public.gift_sends;
drop policy if exists recharge_own on public.recharge_records;
drop policy if exists recharge_admin on public.recharge_records;
drop policy if exists consume_own on public.consume_records;

alter table public.profiles enable row level security;
alter table public.user_sessions enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_likes enable row level security;
alter table public.friendships enable row level security;
alter table public.gifts enable row level security;
alter table public.invite_codes enable row level security;
alter table public.gift_sends enable row level security;
alter table public.recharge_records enable row level security;
alter table public.consume_records enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_insert_own on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy profiles_update_own on public.profiles for update to authenticated using (auth.uid() = id);
create policy profiles_update_admin on public.profiles for update to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
);

create policy sessions_own on public.user_sessions for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy sessions_admin on public.user_sessions for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create policy conversations_select on public.conversations for select to authenticated
using (auth.uid() = user1_id or auth.uid() = user2_id);
create policy conversations_insert on public.conversations for insert to authenticated
with check (auth.uid() = user1_id or auth.uid() = user2_id);
create policy conversations_update on public.conversations for update to authenticated
using (auth.uid() = user1_id or auth.uid() = user2_id)
with check (auth.uid() = user1_id or auth.uid() = user2_id);

create policy messages_select on public.messages for select to authenticated using (
  exists (select 1 from public.conversations c
    where c.id = conversation_id and (c.user1_id = auth.uid() or c.user2_id = auth.uid()))
);
create policy messages_insert on public.messages for insert to authenticated with check (
  auth.uid() = sender_id and exists (select 1 from public.conversations c
    where c.id = conversation_id and (c.user1_id = auth.uid() or c.user2_id = auth.uid()))
);
create policy messages_update_sender on public.messages for update to authenticated
using (auth.uid() = sender_id) with check (auth.uid() = sender_id);

create policy likes_select on public.message_likes for select to authenticated using (
  exists (select 1 from public.messages m where m.id = message_id and exists (
    select 1 from public.conversations c where c.id = m.conversation_id
    and (c.user1_id = auth.uid() or c.user2_id = auth.uid())))
);
create policy likes_insert on public.message_likes for insert to authenticated with check (auth.uid() = user_id);
create policy likes_delete on public.message_likes for delete to authenticated using (auth.uid() = user_id);

create policy friendships_select on public.friendships for select to authenticated
using (auth.uid() = user_id or auth.uid() = friend_id);
create policy friendships_insert on public.friendships for insert to authenticated with check (auth.uid() = user_id);
create policy friendships_delete on public.friendships for delete to authenticated
using (auth.uid() = user_id or auth.uid() = friend_id);

create policy gifts_select on public.gifts for select to authenticated using (is_active = true or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy gifts_write_admin on public.gifts for all to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create policy invite_write_admin on public.invite_codes for all to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create policy gift_sends_select on public.gift_sends for select to authenticated
using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy recharge_select on public.recharge_records for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy consume_select on public.consume_records for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy recharge_insert_admin on public.recharge_records for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- 统一创建会话，避免 user1/user2 反向产生重复记录。
create or replace function public.get_or_create_conversation(p_other_user_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = public
as $$
declare result public.conversations;
  a uuid := least(auth.uid(), p_other_user_id);
  b uuid := greatest(auth.uid(), p_other_user_id);
begin
  if auth.uid() is null or auth.uid() = p_other_user_id then raise exception 'invalid conversation'; end if;
  insert into public.conversations(user1_id, user2_id)
  values (a, b) on conflict (user1_id, user2_id) do update set last_message_at = public.conversations.last_message_at
  returning * into result;
  return result;
end;
$$;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;

-- 原子扣款、记账、送礼和消息写入。前端不得直接修改 profiles.balance。
create or replace function public.send_gift(
  p_gift_id uuid,
  p_receiver_id uuid,
  p_conversation_id uuid,
  p_client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare g public.gifts; sender public.profiles; conv public.conversations; message_id uuid; new_balance numeric;
begin
  if auth.uid() is null or auth.uid() = p_receiver_id then raise exception 'invalid receiver'; end if;
  select * into g from public.gifts where id = p_gift_id and is_active = true;
  if not found then raise exception 'gift unavailable'; end if;
  select * into conv from public.conversations where id = p_conversation_id
    and ((user1_id = auth.uid() and user2_id = p_receiver_id) or (user2_id = auth.uid() and user1_id = p_receiver_id));
  if not found then raise exception 'invalid conversation'; end if;
  select * into sender from public.profiles where id = auth.uid() for update;
  if sender.balance < g.price then raise exception 'insufficient balance'; end if;
  new_balance := sender.balance - g.price;
  update public.profiles set balance = new_balance where id = auth.uid();
  insert into public.consume_records(user_id, amount, type, related_id, remark)
    values (auth.uid(), g.price, 'gift', g.id, g.name);
  insert into public.gift_sends(gift_id, sender_id, receiver_id, conversation_id, price)
    values (g.id, auth.uid(), p_receiver_id, p_conversation_id, g.price);
  insert into public.messages(conversation_id, sender_id, content, msg_type, gift_id, client_request_id)
    values (p_conversation_id, auth.uid(), g.name, 'gift', g.id, p_client_request_id)
    on conflict (sender_id, client_request_id) do nothing returning id into message_id;
  update public.conversations set last_message = '[' || g.name || ']', last_message_at = now()
    where id = p_conversation_id;
  return jsonb_build_object('message_id', message_id, 'balance', new_balance);
end;
$$;
grant execute on function public.send_gift(uuid, uuid, uuid, uuid) to authenticated;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.messages m
  set read_at = now()
  where m.conversation_id = p_conversation_id
    and m.sender_id <> auth.uid()
    and m.read_at is null
    and exists (select 1 from public.conversations c where c.id = m.conversation_id
      and (c.user1_id = auth.uid() or c.user2_id = auth.uid()));
end;
$$;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

create or replace function public.toggle_message_like(p_message_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare liked boolean;
begin
  if exists (select 1 from public.message_likes where message_id = p_message_id and user_id = auth.uid()) then
    delete from public.message_likes where message_id = p_message_id and user_id = auth.uid();
    liked := false;
  else
    insert into public.message_likes(message_id, user_id) values (p_message_id, auth.uid());
    liked := true;
  end if;
  update public.messages m set likes_count = (select count(*) from public.message_likes where message_id = p_message_id)
  where m.id = p_message_id and exists (select 1 from public.conversations c where c.id = m.conversation_id
    and (c.user1_id = auth.uid() or c.user2_id = auth.uid()));
  return jsonb_build_object('liked', liked);
end;
$$;
grant execute on function public.toggle_message_like(uuid) to authenticated;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
