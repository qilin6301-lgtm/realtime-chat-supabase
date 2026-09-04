# 交友平台 · Realtime Chat (Supabase + Render)

基于 Telegram 风格设计的交友即时通讯网页版。支持异性聊天、广场动态、好友搜索、性别年龄注册、邀请码机制等。

## 核心功能

- **注册登录**
  - 男性：邮箱 + 验证码
  - 女性：邮箱 + 验证码 + 邀请码（无邀请码需管理员授权）
  - 注册时必选性别、年龄
- **异性聊天限制**：同性别禁止私聊，仅异性可聊天
- **广场（动态）**：查看所有人发送的文字/照片动态，支持按性别筛选
- **好友系统**：通过用户ID/用户名搜索并添加好友
- **私聊**：Telegram 风格对话界面，实时消息
- **管理面板预留**：管理员可视化视图入口
- **充值接口预留**：余额字段 + 充值按钮占位
- 精美暗色主题 UI，参考 Telegram 设计语言

## 技术栈

- React 18 + Vite
- Supabase（Auth OTP、Realtime、Postgres、Storage 预留）
- 部署：Render Static Site

## 数据库初始化（必须先执行）

进入 Supabase → SQL Editor，执行以下完整 SQL：

```sql
-- 1. 用户资料表
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  gender text not null check (gender in ('male', 'female')),
  age integer not null check (age >= 18 and age <= 99),
  avatar_url text,
  bio text default '',
  is_admin boolean default false,
  is_approved boolean default true,
  balance numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- 2. 邀请码表
create table public.invite_codes (
  code text primary key,
  created_by uuid references public.profiles(id),
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  created_at timestamptz default now()
);

-- 3. 广场动态表
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  content text,
  image_urls text[] default '{}',
  created_at timestamptz default now()
);

-- 4. 会话表（私聊）
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid references public.profiles(id) not null,
  user2_id uuid references public.profiles(id) not null,
  last_message text,
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (user1_id, user2_id)
);

-- 5. 私聊消息表
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamptz default now()
);

-- 6. 好友关系表
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  friend_id uuid references public.profiles(id) not null,
  status text default 'accepted' check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  unique (user_id, friend_id)
);

-- 开启 Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.conversations;

-- RLS
alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.posts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.friendships enable row level security;

-- profiles 策略
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- posts 策略
create policy "Anyone can read posts"
  on public.posts for select using (true);

create policy "Authenticated users can create posts"
  on public.posts for insert to authenticated with check (auth.uid() = user_id);

-- conversations 策略
create policy "Users can view their conversations"
  on public.conversations for select using (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "Users can create conversations"
  on public.conversations for insert to authenticated with check (auth.uid() = user1_id or auth.uid() = user2_id);

-- messages 策略
create policy "Users can view messages in their conversations"
  on public.messages for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  );

create policy "Users can send messages in their conversations"
  on public.messages for insert to authenticated with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  );

-- friendships 策略
create policy "Users can view their friendships"
  on public.friendships for select using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can create friendships"
  on public.friendships for insert to authenticated with check (auth.uid() = user_id);

-- invite_codes 策略（简化，实际可更严格）
create policy "Anyone authenticated can read unused codes"
  on public.invite_codes for select to authenticated using (used_by is null);

create policy "Admins can manage codes"
  on public.invite_codes for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- 触发器：新用户注册后自动创建 profile 的逻辑放在前端完成
```

> 建议在 Supabase Auth 设置中开启 **Email OTP**（禁用密码登录或两者并存）。

## 本地运行

```bash
npm install
cp .env.example .env
# 填入 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY
npm run dev
```

## 部署到 Render

1. 连接 GitHub 仓库
2. Static Site
3. Build: `npm install && npm run build`
4. Publish: `dist`
5. 环境变量：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`

## 项目结构（优化后）

```
src/
├── App.jsx                 # 主路由与布局
├── index.css               # 全局精美样式（Telegram 风格）
├── lib/supabase.js
├── components/
│   ├── Auth.jsx            # 注册/登录（性别、年龄、邀请码、OTP）
│   ├── Layout.jsx          # 底部导航 + 侧边栏
│   ├── Square.jsx          # 广场动态
│   ├── Chats.jsx           # 会话列表
│   ├── ChatWindow.jsx      # 私聊窗口
│   ├── Friends.jsx         # 好友搜索与列表
│   ├── Profile.jsx         # 个人中心（充值预留）
│   └── Admin.jsx           # 管理面板预留
```

## 后续扩展建议

- Supabase Storage 上传头像与动态图片
- 在线状态 Presence
- 消息已读回执
- 真实支付充值对接
- 管理员审核女性注册
- 更多筛选（年龄范围、在线等）

---

Telegram 风格交友平台 · Ready for Render + Supabase
