### 更新说明 - 私有房间、成员表、消息分页与用户头像

我实现了以下功能并已推送到 scaffold/init 分支：

1) 私有房间与 rooms_members 表
- 新增 db/schema_members.sql：定义 rooms_members 表（room_id, user_id, role, created_at）
- 创建索引以提升按房间/用户查询性能
- rooms 创建时，客户端会自动把创建者插入 rooms_members 并分配 role='admin'

2) 增强 RLS（db/rls_enhanced.sql）
- rooms: 仅当房间为 public 或请求用户为成员时允许 SELECT
- rooms: 只有房间创建者可更新/删除
- rooms_members: 允许用户为自己插入成员记录或房间创建者为成员添加用户
- messages: 仅当房间为 public 或请求用户为成员时允许 SELECT；插入要求 author = auth.uid() 且用户为成员或房间为 public
- messages: 只有消息作者可以修改/删除自己的消息

3) 消息分页（前端）
- 修改 src/app/rooms/[id]/page.tsx：使用 cursor（created_at）分页加载最新消息，提供“加载更早消息”按钮，实时订阅新插入的消息
- page size 默认为 30，可按需调整

4) 房间创建 UI 改进
- 修改 src/pages/rooms/index.tsx：新增“是否公共房间”复选框；创建房间后会在 rooms_members 中为创建者添加 admin 成员记录

5) 用户资料与头像（前端）
- 新增 src/pages/profile.tsx：用户可以设置用户名、上传头像到 Supabase Storage 的 avatars bucket，并将公开 URL 保存到 profiles.avatar_url
- 注意：请在 Supabase 控制台创建名为 "avatars" 的 Storage bucket 并设为公开或配置策略以获取公开 URL

下一步与注意事项：
- 请在 Supabase SQL Editor 执行：
  - db/schema.sql (已有基础表)
  - db/schema_members.sql (新增 members 表)
  - db/rls_enhanced.sql (新的 RLS 策略)

- 确保 profiles 表已存在（db/schema.sql 已创建），并确保 pgcrypto 扩展可用
- 在本地 .env.local 中配置并保管好 SUPABASE_SERVICE_ROLE_KEY、RESEND_API_KEY、VERIFICATION_HMAC_SECRET
- 如果你使用 Supabase Storage 的私有 bucket，请调整上传与获取公开 URL 的逻辑（当前代码使用 getPublicUrl)

如需，我可以：
- 把上述 SQL 合并到一个文件并在 README 中给出一键执行步骤
- 实现服务器端 API 来由房间管理员管理成员（例如移除成员、设置 role）
- 添加更多前端 UX（成员列表、房间详情页、私有房间加入流程）

现在我将继续按你的计划推进下一项（消息分页与历史加载已初步完成；接下来要实现的第 3 项是 用户资料与头像 — 我已初步实现头像上传与资料保存）。

请告诉我是否继续把这些变更合并到 main（我可以为你创建 PR），或者你希望我先完善某些细节（例如成员管理 API / avatar storage policy）再创建 PR。