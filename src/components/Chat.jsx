import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function Chat({ session }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)

  const username = session.user.user_metadata?.username || session.user.email?.split('@')[0] || '匿名'

  // 加载历史消息 + 订阅实时消息
  useEffect(() => {
    fetchMessages()

    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      console.error(error)
    } else {
      setMessages(data || [])
    }
    setLoading(false)
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!newMessage.trim()) return

    const content = newMessage.trim()
    setNewMessage('')

    const { error } = await supabase.from('messages').insert({
      user_id: session.user.id,
      username,
      content
    })

    if (error) {
      console.error(error)
      alert('发送失败：' + error.message)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f0f' }}>
      {/* 顶部栏 */}
      <div style={{
        padding: '1rem 1.5rem',
        background: '#1a1a1a',
        borderBottom: '1px solid #2a2a2a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ fontSize: '1.2rem' }}>实时聊天室</h2>
          <p style={{ fontSize: '0.85rem', color: '#888' }}>你好，{username}</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: '1px solid #444',
            background: 'transparent',
            color: '#ccc',
            cursor: 'pointer'
          }}
        >
          退出登录
        </button>
      </div>

      {/* 消息列表 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem'
      }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#666' }}>加载消息中...</p>
        ) : messages.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>还没有消息，快来发送第一条吧！</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                alignSelf: msg.user_id === session.user.id ? 'flex-end' : 'flex-start',
                maxWidth: '70%'
              }}
            >
              <div style={{
                background: msg.user_id === session.user.id ? '#5b7cfa' : '#2a2a2a',
                padding: '0.7rem 1rem',
                borderRadius: '12px',
                borderBottomRightRadius: msg.user_id === session.user.id ? '4px' : '12px',
                borderBottomLeftRadius: msg.user_id === session.user.id ? '12px' : '4px'
              }}>
                {msg.user_id !== session.user.id && (
                  <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '0.25rem' }}>
                    {msg.username}
                  </div>
                )}
                <div style={{ wordBreak: 'break-word' }}>{msg.content}</div>
              </div>
              <div style={{
                fontSize: '0.7rem',
                color: '#666',
                marginTop: '0.25rem',
                textAlign: msg.user_id === session.user.id ? 'right' : 'left'
              }}>
                {new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <form onSubmit={sendMessage} style={{
        padding: '1rem 1.5rem',
        background: '#1a1a1a',
        borderTop: '1px solid #2a2a2a',
        display: 'flex',
        gap: '0.8rem'
      }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="输入消息..."
          style={{
            flex: 1,
            padding: '0.85rem 1.2rem',
            borderRadius: '24px',
            border: '1px solid #333',
            background: '#2a2a2a',
            color: '#fff',
            fontSize: '1rem',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.85rem 1.5rem',
            borderRadius: '24px',
            border: 'none',
            background: '#5b7cfa',
            color: '#fff',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          发送
        </button>
      </form>
    </div>
  )
}
