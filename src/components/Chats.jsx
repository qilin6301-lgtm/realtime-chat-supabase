import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Chats({ profile, onSelectConversation }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConversations()

    const channel = supabase
      .channel('public:conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        loadConversations()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function loadConversations() {
    setLoading(true)
    const { data } = await supabase
      .from('conversations')
      .select(`
        id, last_message, last_message_at, user1_id, user2_id,
        user1:user1_id ( id, username, gender, age ),
        user2:user2_id ( id, username, gender, age )
      `)
      .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
      .order('last_message_at', { ascending: false })

    const list = (data || []).map(c => {
      const other = c.user1_id === profile.id ? c.user2 : c.user1
      return { ...c, otherUser: other }
    })

    setConversations(list)
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
        消息
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>加载中...</p>
        ) : conversations.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>💬</div>
            <p>暂无会话</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>去「好友」搜索异性开始聊天</p>
          </div>
        ) : (
          conversations.map(c => (
            <div
              key={c.id}
              onClick={() => onSelectConversation(c, c.otherUser)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                background: c.otherUser?.gender === 'male' ? 'var(--male)' : 'var(--female)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, color: '#0e0e0e', fontSize: 18
              }}>
                {c.otherUser?.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{c.otherUser?.username}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div style={{
                  fontSize: 13, color: 'var(--text-secondary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2
                }}>
                  {c.last_message || '开始聊天吧'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
