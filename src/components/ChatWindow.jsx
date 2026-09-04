import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function ChatWindow({ conversation, profile, onBack }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const endRef = useRef(null)
  const other = conversation.otherUser

  useEffect(() => {
    fetchMessages()

    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [conversation.id])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchMessages() {
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(200)

    setMessages(data || [])
    setLoading(false)
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!text.trim()) return

    // 再次检查异性（双重保险）
    if (other.gender === profile.gender) {
      alert('同性别禁止聊天')
      return
    }

    const content = text.trim()
    setText('')

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: profile.id,
      content
    })

    if (error) {
      alert('发送失败：' + error.message)
      return
    }

    // 更新会话最后消息
    await supabase
      .from('conversations')
      .update({
        last_message: content,
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversation.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)' }}>
      {/* 顶部 */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', color: 'var(--accent)',
            fontSize: 20, cursor: 'pointer', padding: '4px 8px'
          }}
        >‹</button>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: other?.gender === 'male' ? 'var(--male)' : 'var(--female)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, color: '#0e0e0e'
        }}>
          {other?.username?.[0]?.toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>{other?.username}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            <span className={`gender-tag ${other?.gender === 'male' ? 'gender-male' : 'gender-female'}`}>
              {other?.gender === 'male' ? '♂ 男' : '♀ 女'} · {other?.age}岁
            </span>
          </div>
        </div>
      </div>

      {/* 消息区 */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: 10
      }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>加载消息...</p>
        ) : messages.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>还没有消息，打个招呼吧</p>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === profile.id
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <div className={`message-bubble ${isMe ? 'message-out' : 'message-in'}`}>
                  {msg.content}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, padding: '0 4px' }}>
                  {new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      {/* 输入区 */}
      <form onSubmit={sendMessage} style={{
        padding: '12px 16px',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: 10
      }}>
        <input
          className="input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="输入消息..."
          style={{ borderRadius: 22, padding: '10px 18px' }}
        />
        <button className="btn btn-primary" type="submit" style={{ borderRadius: 22, padding: '10px 20px' }}>
          发送
        </button>
      </form>
    </div>
  )
}
