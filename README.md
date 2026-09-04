# Realtime Chat Web App (Supabase + Render)

一个基于 **Supabase**（认证 + 实时数据库）的即时通讯网页版，可直接部署到 **Render**。

## 功能

- 用户注册 / 登录（邮箱密码）
- 全局实时聊天室
- 消息持久化 + Realtime 推送
- 简洁现代 UI（暗色主题）
- 完全前后端分离（前端静态托管）

## 技术栈

- React 18 + Vite
- Supabase JS Client（Auth + Realtime + Postgres）
- 部署：Render Static Site

## 快速开始（本地开发）

### 1. 创建 Supabase 项目

1. 去 [https://supabase.com](https://supabase.com) 创建新项目
2. 进入 **SQL Editor**，执行以下 SQL：

```sql
-- 创建消息表
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  username text not null,
  content text not null,
  created_at timestamptz default now() not null
);

-- 开启 Realtime
alter publication supabase_realtime add table public.messages;

-- RLS 策略
alter table public.messages enable row level security;

create policy "Anyone authenticated can read messages"
  on public.messages for select
  to authenticated
  using (true);

create policy "Users can insert their own messages"
  on public.messages for insert
  to authenticated
  with check (auth.uid() = user_id);
```

3. 去 **Project Settings → API**，复制：
   - Project URL
   - `anon` `public` key

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

填入你的 Supabase 信息：

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. 安装并运行

```bash
npm install
npm run dev
```

打开 http://localhost:5173

## 部署到 Render

1. Fork 或直接连接这个 GitHub 仓库到 [Render](https://render.com)
2. 新建 **Static Site**
3. 设置：
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. 在 **Environment** 添加：
   - `VITE_SUPABASE_URL` = 你的 Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = 你的 anon key
5. 部署完成后即可访问

> 注意：Vite 会在构建时把 `VITE_` 开头的环境变量注入到前端代码中。

## 项目结构

```
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── lib/
│   │   └── supabase.js
│   └── components/
│       ├── Auth.jsx
│       └── Chat.jsx
└── README.md
```

## 后续可扩展

- 私聊 / 房间系统
- 在线状态（Presence）
- 图片/文件上传（Supabase Storage）
- 消息已读状态
- 用户头像与个人资料

---

Made for quick deploy on Render + Supabase.
