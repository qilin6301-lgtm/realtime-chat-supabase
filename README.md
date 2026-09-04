# 交友平台 · Realtime Chat (Supabase + Render)

基于 Telegram 风格设计的交友即时通讯网页版。

## 核心功能

- 注册登录（邮箱 OTP + 性别年龄 + 女性邀请码/审核）
- 异性聊天限制
- 广场动态（文字 + 图片）
- 好友搜索（用户名 / ID）
- 私聊：实时消息、表情、礼物、图片
- **头像**：上传自定义 或 选择系统默认头像
- **消息已读**、点赞、编辑、删除（软删除）
- **设备登录限制**：默认每账号 1 台设备，管理员可设置 1-10 台
- 在线状态、礼物系统、独立管理看板
- 充值 / 消费记录预留

## 技术栈

- React 18 + Vite
- Supabase（Auth OTP、Realtime、Postgres、Storage）
- 部署：Render Static Site

## 数据库初始化（请完整执行）

```sql
-- ========== 用户资料 ==========
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  gender text not null check (gender in ('male', 'female')),
  age integer not null check (age >= 18 and age <= 99),
  avatar_url text,
  bio text default '',
  is_admin boolean default false,
  is_approved boolean default true,
  balance numeric(12,2) default 0,
  max_devices integer default 1 check (max_devices >= 1 and max_devices <= 10),
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

-- ========== 设备会话（登录限制） ==========
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  device_id text not null,
  device_name text,
  last_active timestamptz default now(),
  created_at timestamptz default now(),
  unique (user_id, device_id)
);

-- ========== 邀请码 ==========
create table if not exists public.invite_codes (
  code text primary key,
  created_by uuid references public.profiles(id),
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  created_at timestamptz default now()
);

-- ========== 广场 ==========
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  content text,
  image_urls text[] default '{}',
  created_at timestamptz default now()
);

-- ========== 会话 & 消息 ==========
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid references public.profiles(id) not null,
  user2_id uuid references public.profiles(id) not null,
  last_message text,
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (user1_id, user2_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) not null,
  content text not null,
  msg_type text default 'text' check (msg_type in ('text', 'image', 'gift', 'emoji')),
  gift_id uuid,
  is_deleted boolean default false,
  edited_at timestamptz,
  read_at timestamptz,
  likes_count integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.message_likes (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  created_at timestamptz default now(),
  unique (message_id, user_id)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  friend_id uuid references public.profiles(id) not null,
  status text default 'accepted' check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  unique (user_id, friend_id)
);

-- ========== 礼物 ==========
create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon_url text,
  price numeric(10,2) not null default 0,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.gift_sends (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid references public.gifts(id) not null,
  sender_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id) not null,
  conversation_id uuid references public.conversations(id),
  price numeric(10,2) not null,
  created_at timestamptz default now()
);

-- ========== 财务 ==========
create table if not exists public.recharge_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  amount numeric(12,2) not null,
  method text default 'manual',
  status text default 'success',
  remark text,
  created_at timestamptz default now()
);

create table if not exists public.consume_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  amount numeric(12,2) not null,
  type text not null,
  related_id uuid,
  remark text,
  created_at timestamptz default now()
);

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.message_likes;

-- RLS（简化，生产建议细化）
alter table public.profiles enable row level security;
alter table public.user_sessions enable row level security;
alter table public.invite_codes enable row level security;
alter table public.posts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_likes enable row level security;
alter table public.friendships enable row level security;
alter table public.gifts enable row level security;
alter table public.gift_sends enable row level security;
alter table public.recharge_records enable row level security;
alter table public.consume_records enable row level security;

create policy "profiles_all" on public.profiles for all using (true) with check (true);
create policy "sessions_own" on public.user_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions_admin" on public.user_sessions for select using (exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "posts_all" on public.posts for all using (true) with check (auth.uid() = user_id);
create policy "conv_own" on public.conversations for all using (auth.uid() = user1_id or auth.uid() = user2_id);
create policy "msg_own" on public.messages for all using (
  exists (select 1 from conversations c where c.id = conversation_id and (c.user1_id = auth.uid() or c.user2_id = auth.uid()))
);
create policy "likes_all" on public.message_likes for all using (true) with check (auth.uid() = user_id);
create policy "friends_own" on public.friendships for all using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "gifts_read" on public.gifts for select using (true);
create policy "gifts_admin" on public.gifts for all using (exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "invite_all" on public.invite_codes for all using (true);
create policy "gift_sends_own" on public.gift_sends for all using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "recharge_own" on public.recharge_records for select using (auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "recharge_admin" on public.recharge_records for insert with check (exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "consume_own" on public.consume_records for all using (auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and is_admin));
```

### Storage

创建 Public Buckets：`avatars`、`posts`、`gifts`

### Auth

开启 Email OTP。

## 设备登录限制说明

- 每个账号默认 `max_devices = 1`
- 客户端生成并保存 `device_id`（localStorage）
- 登录成功后注册会话；超过限制会踢掉最旧设备或提示
- 管理员可在管理看板为指定用户设置 1-10 台设备上限

## 管理看板

前端独立页面（`is_admin=true` 可见）：
- 数据概览、待审核、邀请码、礼物管理、财务
- **用户设备管理**：设置某用户最大登录设备数

第一个管理员：在 Supabase 把 `profiles.is_admin` 设为 true。

## 部署

Render Static Site → Build: `npm install && npm run build` → Publish: `dist`

环境变量：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`

---

持续优化中
