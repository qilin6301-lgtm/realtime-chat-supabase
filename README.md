# 交友平台 · Realtime Chat (Supabase + Render)

基于 Telegram 风格设计的交友即时通讯网页版。

## 核心功能

- **注册登录**：邮箱 + 验证码（OTP）。男性直接完成；女性需邀请码或管理员审核
- **性别 + 年龄**强制填写，同性别禁止私聊
- **广场动态**：文字 + 图片，按性别筛选
- **好友搜索**（用户名 / ID）
- **私聊**：实时消息、表情、礼物
- **图片上传**：头像、动态图片、礼物图标（Supabase Storage）
- **在线状态**：Realtime Presence
- **礼物系统**：平台内置礼物，可定价，管理员后台配置
- **独立管理看板**：用户统计、男女比例、在线人数、邀请码分发、充值/消费记录、礼物管理
- **充值预留**：余额 + 充值记录表

## 技术栈

- React 18 + Vite
- Supabase（Auth OTP、Realtime Presence、Postgres、Storage）
- 部署：Render Static Site

## 数据库初始化（请完整执行）

进入 Supabase → SQL Editor 执行：

```sql
-- ========== 基础表 ==========
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
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.invite_codes (
  code text primary key,
  created_by uuid references public.profiles(id),
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  content text,
  image_urls text[] default '{}',
  created_at timestamptz default now()
);

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
  created_at timestamptz default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  friend_id uuid references public.profiles(id) not null,
  status text default 'accepted' check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  unique (user_id, friend_id)
);

-- ========== 礼物系统 ==========
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

-- ========== 财务记录 ==========
create table if not exists public.recharge_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  amount numeric(12,2) not null,
  method text default 'manual', -- manual / wechat / alipay / stripe
  status text default 'success',
  remark text,
  created_at timestamptz default now()
);

create table if not exists public.consume_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  amount numeric(12,2) not null,
  type text not null, -- gift / other
  related_id uuid,
  remark text,
  created_at timestamptz default now()
);

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.profiles;

-- RLS
alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.posts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.friendships enable row level security;
alter table public.gifts enable row level security;
alter table public.gift_sends enable row level security;
alter table public.recharge_records enable row level security;
alter table public.consume_records enable row level security;

-- 基础策略（简化版，生产环境建议更细）
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id or exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "posts_select" on public.posts for select using (true);
create policy "posts_insert" on public.posts for insert to authenticated with check (auth.uid() = user_id);

create policy "conversations_select" on public.conversations for select using (auth.uid() = user1_id or auth.uid() = user2_id);
create policy "conversations_insert" on public.conversations for insert to authenticated with check (auth.uid() = user1_id or auth.uid() = user2_id);
create policy "conversations_update" on public.conversations for update using (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "messages_select" on public.messages for select using (
  exists (select 1 from conversations c where c.id = conversation_id and (c.user1_id = auth.uid() or c.user2_id = auth.uid()))
);
create policy "messages_insert" on public.messages for insert to authenticated with check (auth.uid() = sender_id);

create policy "friendships_select" on public.friendships for select using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "friendships_insert" on public.friendships for insert to authenticated with check (auth.uid() = user_id);

create policy "gifts_select" on public.gifts for select using (true);
create policy "gifts_admin" on public.gifts for all using (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "invite_codes_select" on public.invite_codes for select to authenticated using (true);
create policy "invite_codes_admin" on public.invite_codes for all using (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "gift_sends_select" on public.gift_sends for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "gift_sends_insert" on public.gift_sends for insert to authenticated with check (auth.uid() = sender_id);

create policy "recharge_select" on public.recharge_records for select using (auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "recharge_admin" on public.recharge_records for insert with check (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "consume_select" on public.consume_records for select using (auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "consume_insert" on public.consume_records for insert to authenticated with check (auth.uid() = user_id);
```

### Storage 配置

1. 在 Supabase → Storage 创建 bucket：`avatars`、`posts`、`gifts`（建议 Public）
2. 设置对应 policy 允许 authenticated 上传、所有人读取

### Auth

开启 Email OTP。

## 本地运行

```bash
npm install
cp .env.example .env
npm run dev
```

## 部署到 Render

Static Site → Build: `npm install && npm run build` → Publish: `dist`
环境变量：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`

## 管理面板说明

管理面板是**前端独立看板页面**（不是 Supabase Dashboard）。
只有 `profiles.is_admin = true` 的用户可进入。
可在「我的」页面点击「管理面板」进入。

功能包括：
- 数据概览（总用户、男女数量、在线人数）
- 待审核女性用户批准
- 邀请码生成与分发
- 礼物管理（名称、价格、图标、上下架）
- 充值记录 / 消费记录查看
- 手动给用户充值（预留）

第一个管理员：在 Supabase Table Editor 把某个用户的 `is_admin` 设为 `true`。

---

Telegram 风格交友平台 · 持续优化中
