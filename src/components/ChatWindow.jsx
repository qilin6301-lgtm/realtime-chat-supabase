import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../i18n'
import { notifyNewMessage } from '../lib/notify'

const EMOJIS = ['😀','😂','🥰','😍','😘','😊','🤔','😅','😭','😡','👍','👎','❤️','🔥','🎉','🌹','💋','🎁','💯','🙏']

export default function ChatWindow({ conversation, profile, onBack }) {
  const { t, countryName } = useI18n()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showGifts, setShowGifts] = useState(false)
  const [gifts, setGifts] = useState([])
  const [uploading, setUploading] = useState(false)
  const [myLikes, setMyLikes] = useState(new Set())
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [peerTyping, setPeerTyping] = useState(false)
  const endRef = useRef(null)
  const fileRef = useRef(null)
  const typingChannelRef = useRef(null)
  const typingTimerRef = useRef(null)
  const other = conversation.otherUser

  useEffect(() => {
    fetchMessages()
    loadGifts()
    markAsRead()

    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, (payload) => {
        const msg = payload.new
        setMessages(prev => [...prev, msg])
        if (msg.sender_id !== profile.id) {
          markAsRead()
          notifyNewMessage({
            title: other?.username || t('new_message'),
            body: msg.msg_type === 'image' ? '[image]' : msg.msg_type === 'gift' ? `[${t('gift')}]` : msg.content
          })
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, () => fetchMessages())
      .subscribe()

    // Typing broadcast
    const typingCh = supabase.channel(`typing:${conversation.id}`, {
      config: { broadcast: { self: false } }
    })
    typingCh
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.user_id !== profile.id) {
          setPeerTyping(true)
          clearTimeout(typingTimerRef.current)
          typingTimerRef.current = setTimeout(() => setPeerTyping(false), 2000)
        }
      })
      .subscribe()
    typingChannelRef.current = typingCh

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(typingCh)
      clearTimeout(typingTimerRef.current)
    }
  }, [conversation.id])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, peerTyping])

  function broadcastTyping() {
    typingChannelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: profile.id }
    })
  }

  async function fetchMessages() {
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(200)
    setMessages((data || []).filter(m => !m.is_deleted || m.sender_id === profile.id))
    setLoading(false)
    loadMyLikes(data)
    markAsRead()
  }

  async function loadMyLikes(msgs) {
    const list = msgs || messages
    if (!list?.length) return
    const ids = list.map(m => m.id)
    const { data } = await supabase.from('message_likes').select('message_id').eq('user_id', profile.id).in('message_id', ids)
    setMyLikes(new Set((data || []).map(d => d.message_id)))
  }

  async function loadGifts() {
    const { data } = await supabase.from('gifts').select('*').eq('is_active', true).order('sort_order')
    setGifts(data || [])
  }

  async function markAsRead() {
    await supabase.from('messages').update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversation.id).neq('sender_id', profile.id).is('read_at', null)
  }

  async function sendMessage(content, msg_type = 'text', gift_id = null) {
    if (other.gender === profile.gender) {
      alert(t('same_gender_block'))
      return
    }
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: profile.id,
      content,
      msg_type,
      gift_id
    })
    if (error) {
      alert(error.message)
      return
    }
    await supabase.from('conversations').update({
      last_message: msg_type === 'gift' ? `[${t('gift')}]` : msg_type === 'image' ? '[image]' : content,
      last_message_at: new Date().toISOString()
    }).eq('id', conversation.id)
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!text.trim()) return
    const content = text.trim()
    setText('')
    setShowEmoji(false)
    await sendMessage(content, 'text')
  }

  async function toggleLike(msg) {
    if (myLikes.has(msg.id)) {
      await supabase.from('message_likes').delete().eq('message_id', msg.id).eq('user_id', profile.id)
      await supabase.from('messages').update({ likes_count: Math.max(0, (msg.likes_count || 1) - 1) }).eq('id', msg.id)
    } else {
      await supabase.from('message_likes').insert({ message_id: msg.id, user_id: profile.id })
      await supabase.from('messages').update({ likes_count: (msg.likes_count || 0) + 1 }).eq('id', msg.id)
    }
    fetchMessages()
  }

  async function softDelete(msg) {
    if (!confirm(t('delete_msg_confirm'))) return
    // 软删除：自己可见为已删除，对方也看到已删除文案
    await supabase.from('messages').update({ is_deleted: true, content: t('deleted_msg') }).eq('id', msg.id)
    fetchMessages()
  }

  async function saveEdit(msg) {
    if (!editText.trim()) return
    await supabase.from('messages').update({ content: editText.trim(), edited_at: new Date().toISOString() }).eq('id', msg.id)
    setEditingId(null)
    setEditText('')
    fetchMessages()
  }

  async function sendGift(gift) {
    if (parseFloat(profile.balance) < parseFloat(gift.price)) {
      alert(t('insufficient_balance'))
      return
    }
    const newBalance = parseFloat(profile.balance) - parseFloat(gift.price)
    await supabase.from('profiles').update({ balance: newBalance }).eq('id', profile.id)
    await supabase.from('consume_records').insert({
      user_id: profile.id, amount: gift.price, type: 'gift', related_id: gift.id,
      remark: `${gift.name} -> ${other.username}`
    })
    await supabase.from('gift_sends').insert({
      gift_id: gift.id, sender_id: profile.id, receiver_id: other.id,
      conversation_id: conversation.id, price: gift.price
    })
    await sendMessage(gift.name, 'gift', gift.id)
    setShowGifts(false)
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) return alert('Max 5MB')
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('posts').upload(path, file)
    if (error) {
      alert(error.message)
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(path)
    await sendMessage(publicUrl, 'image')
    setUploading(false)
    e.target.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)' }}>
      <div style={{
        padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 22, cursor: 'pointer' }}>‹</button>
        {other?.avatar_url ? (
          <img src={other.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: other?.gender === 'male' ? 'var(--male)' : 'var(--female)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0e0e0e'
          }}>{other?.username?.[0]?.toUpperCase()}</div>
        )}
        <div>
          <div style={{ fontWeight: 600 }}>{other?.username}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {peerTyping ? (
              <span style={{ color: 'var(--accent)' }}>{t('typing')}</span>
            ) : (
              <>
                <span className={`gender-tag ${other?.gender === 'male' ? 'gender-male' : 'gender-female'}`}>
                  {other?.gender === 'male' ? '♂' : '♀'} {t('years_old', { age: other?.age })}
                </span>
                {other?.country && <span style={{ marginLeft: 6 }}>· {countryName(other.country)}</span>}
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{t('loading')}</p>
        ) : messages.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>{t('no_messages')}</p>
        ) : messages.map(msg => {
          const isMe = msg.sender_id === profile.id
          const isDeleted = msg.is_deleted
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              {editingId === msg.id ? (
                <div style={{ display: 'flex', gap: 6, maxWidth: '80%' }}>
                  <input className="input" value={editText} onChange={e => setEditText(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn btn-primary" style={{ padding: '6px 10px' }} onClick={() => saveEdit(msg)}>{t('save')}</button>
                  <button className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={() => setEditingId(null)}>{t('cancel')}</button>
                </div>
              ) : isDeleted ? (
                <div className={`message-bubble ${isMe ? 'message-out' : 'message-in'}`} style={{ opacity: 0.5, fontStyle: 'italic' }}>
                  {t('deleted_msg')}
                </div>
              ) : msg.msg_type === 'image' ? (
                <img src={msg.content} alt="" style={{ maxWidth: 220, borderRadius: 12, cursor: 'pointer' }} onClick={() => window.open(msg.content)} />
              ) : msg.msg_type === 'gift' ? (
                <div className={`message-bubble ${isMe ? 'message-out' : 'message-in'}`} style={{ textAlign: 'center', minWidth: 100 }}>
                  <div style={{ fontSize: 32 }}>🎁</div>
                  <div style={{ fontWeight: 600 }}>{msg.content}</div>
                </div>
              ) : (
                <div className={`message-bubble ${isMe ? 'message-out' : 'message-in'}`}>
                  {msg.content}
                  {msg.edited_at && <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 6 }}>({t('edited')})</span>}
                </div>
              )}
              {!isDeleted && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, padding: '0 4px', fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isMe && msg.read_at && <span style={{ color: 'var(--accent)' }}>{t('read')}</span>}
                  <button onClick={() => toggleLike(msg)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
                    color: myLikes.has(msg.id) ? '#f48fb1' : 'var(--text-muted)'
                  }}>
                    {myLikes.has(msg.id) ? '❤️' : '🤍'} {msg.likes_count > 0 ? msg.likes_count : ''}
                  </button>
                  {isMe && msg.msg_type === 'text' && (
                    <>
                      <button onClick={() => { setEditingId(msg.id); setEditText(msg.content) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)' }}>{t('edit')}</button>
                      <button onClick={() => softDelete(msg)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)' }}>{t('delete')}</button>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {showEmoji && (
        <div style={{ padding: 10, background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EMOJIS.map(em => (
            <button key={em} onClick={() => { setText(x => x + em); setShowEmoji(false) }} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: 4 }}>{em}</button>
          ))}
        </div>
      )}

      {showGifts && (
        <div style={{ padding: 12, background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', maxHeight: 200, overflowY: 'auto' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{t('send_gift')} (¥{(profile.balance || 0).toFixed(2)})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {gifts.map(g => (
              <button key={g.id} onClick={() => sendGift(g)} style={{
                background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 10,
                padding: '8px 12px', cursor: 'pointer', color: 'var(--text-primary)', minWidth: 70, textAlign: 'center'
              }}>
                <div style={{ fontSize: 24 }}>{g.icon_url ? <img src={g.icon_url} alt="" style={{ width: 28, height: 28 }} /> : '🎁'}</div>
                <div style={{ fontSize: 12 }}>{g.name}</div>
                <div style={{ fontSize: 11, color: 'var(--accent)' }}>¥{parseFloat(g.price).toFixed(0)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSend} style={{
        padding: '10px 12px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        <button type="button" onClick={() => { setShowEmoji(!showEmoji); setShowGifts(false) }} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-secondary)' }}>😊</button>
        <button type="button" onClick={() => { setShowGifts(!showGifts); setShowEmoji(false) }} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-secondary)' }}>🎁</button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-secondary)' }}>{uploading ? '...' : '🖼'}</button>
        <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
        <input
          className="input"
          value={text}
          onChange={e => { setText(e.target.value); broadcastTyping() }}
          placeholder={t('input_message')}
          style={{ borderRadius: 22, padding: '10px 16px', flex: 1 }}
        />
        <button className="btn btn-primary" type="submit" style={{ borderRadius: 22, padding: '10px 16px' }}>{t('send')}</button>
      </form>
    </div>
  )
}
