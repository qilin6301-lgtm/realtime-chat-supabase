import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../i18n'

function isOnline(lastSeen) {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000
}

function formatTime(iso, locale) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return '1d'
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

export default function Chats({ profile, onSelectConversation, activeId }) {
  const { t, lang } = useI18n()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    loadConversations()
    const channel = supabase
      .channel('public:conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadConversations())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [profile.id])

  async function loadConversations() {
    setLoading(true)
    const { data } = await supabase
      .from('conversations')
      .select(`
        id, last_message, last_message_at, user1_id, user2_id,
        user1:user1_id ( id, username, gender, age, avatar_url, last_seen, country ),
        user2:user2_id ( id, username, gender, age, avatar_url, last_seen, country )
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(c => c.otherUser?.username?.toLowerCase().includes(q))
  }, [conversations, query])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}>{t('chats')}</div>
        <input
          className="input search-input"
          placeholder={t('search')}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>{t('loading')}</p>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <p>{t('no_chats')}</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>{t('start_chat_hint')}</p>
          </div>
        ) : (
          filtered.map(c => {
            const active = activeId === c.id
            const online = isOnline(c.otherUser?.last_seen)
            return (
              <div
                key={c.id}
                className={`chat-list-item ${active ? 'active' : ''}`}
                onClick={() => onSelectConversation(c, c.otherUser)}
              >
                <div className="avatar-wrap">
                  {c.otherUser?.avatar_url ? (
                    <img src={c.otherUser.avatar_url} alt="" className="avatar-img" />
                  ) : (
                    <div
                      className="avatar-fallback"
                      style={{ background: c.otherUser?.gender === 'male' ? 'var(--male)' : 'var(--female)' }}
                    >
                      {c.otherUser?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  {online && <span className="online-dot" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.otherUser?.username}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {formatTime(c.last_message_at, lang === 'zh' ? 'zh-CN' : undefined)}
                    </span>
                  </div>
                  <div className="chat-preview">
                    {c.last_message || t('no_messages')}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
