### 更新 - Presence、idempotency 与验证码限流

我已实现并推送以下改动到 scaffold/init：

1) Presence
- 新增 db/schema_presence.sql（presence 表），用于记录用户在房间的 last_seen。
- 房间页面每 30s 向 presence 表 upsert 心跳（通过 supabase client，RLS 控制访问）。
- 房间页面订阅 presence 表的变更并展示在线用户（profiles.username 或 id）。

2) 消息幂等（idempotency）
- 新增 db/schema_idempotency.sql：向 messages 表添加 client_msg_id 字段并为 (room_id, client_msg_id) 建立唯一索引（当 client_msg_id 非空时）。
- 前端发送消息时会生成 client_msg_id（UUID）并随消息插入，数据库约束确保幂等插入不会重复。

3) 验证码速率限制
- send-code API 已增加简单的速率限制：同一 email 在 1 小时内最多请求 5 次验证码，超过返回 429。

请在 Supabase 控制台执行：
- db/schema_presence.sql
- db/schema_idempotency.sql

注意：
- presence 表与 RLS（若需更严格访问控制，请把相关策略合并到 db/rls_enhanced.sql）
- 如果你想用 Realtime channel 的 Presence 功能（非表），我也可以改用 supabase-js channel presence APIs，当前实现使用数据库表更易于审计与简单查询。

下一步我准备实现：
- Presence 的更完善 UI（显示在线时长、typing 指示）
- 消息去重的后端幂等处理示例（如果想在服务端强制）
- 更完善的安全（IP 限速、验证码尝试次数增设）

是否继续直接在 scaffold/init 上实现这些，还是我现在为你创建一个 PR（scaffold/init → main）并在 PR 中继续提交后续更改？
