-- 收紧 RLS（在已有表上执行；按需调整）
-- 注意：若已有宽松 policy，请先 drop 再 create

-- profiles: 公开读，仅本人可改自己的非 admin 字段
drop policy if exists "profiles_all" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (
  auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- messages: 仅会话参与者
drop policy if exists "msg_own" on public.messages;
create policy "messages_select" on public.messages for select using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
  )
);
create policy "messages_insert" on public.messages for insert with check (
  auth.uid() = sender_id and
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
  )
);
create policy "messages_update" on public.messages for update using (
  auth.uid() = sender_id or
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
  )
);

-- friendships
drop policy if exists "friends_own" on public.friendships;
create policy "friendships_select" on public.friendships for select using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "friendships_insert" on public.friendships for insert with check (auth.uid() = user_id);
create policy "friendships_delete" on public.friendships for delete using (auth.uid() = user_id or auth.uid() = friend_id);

-- gifts: 所有人可读，仅 admin 写
drop policy if exists "gifts_read" on public.gifts;
drop policy if exists "gifts_admin" on public.gifts;
create policy "gifts_select" on public.gifts for select using (true);
create policy "gifts_write_admin" on public.gifts for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- invite_codes
drop policy if exists "invite_all" on public.invite_codes;
create policy "invite_select" on public.invite_codes for select to authenticated using (true);
create policy "invite_write_admin" on public.invite_codes for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- 若 profiles 尚无 country 字段：
alter table public.profiles add column if not exists country text;
