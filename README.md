# Realtime Chat - Supabase + Render

这是一个最小可运行的即时通讯 (Realtime) 应用骨架，使用 Next.js + TypeScript + Tailwind，后端依赖 Supabase（Auth + Postgres + Realtime），邮件通过 Resend 发送验证码注册。

快速开始：

1. 克隆仓库
   git clone https://github.com/qilin6301-lgtm/realtime-chat-supabase
2. 安装依赖
   npm install
3. 复制环境变量并填写
   cp .env.example .env.local
   编辑 .env.local，填入 SUPABASE 和 RESEND 的值
4. 在 Supabase 控制台导入 db/schema.sql（和 db/rls.sql）
5. 启动开发服务器
   npm run dev

重要环境变量：NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY、SUPABASE_SERVICE_ROLE_KEY、RESEND_API_KEY、VERIFICATION_HMAC_SECRET

更多信息请查看 db/ 目录中的 SQL 脚本，以及 src/pages/api/auth/ 下的 API 实现。
