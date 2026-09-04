import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function isOnline(lastSeen) {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000
}

export default function Friends({ profile, onStartChat }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    loadFriends()
  }, [])

  async function loadFriends() {
    setLoading(true)
    const { data } = await supabase
      .from('friendships')
      .select(`
        id, status, created_at,
        friend:friend_id ( id, username, gender, age, last_seen )
      `)
      .eq('user_id', profile.id)
      .eq('status', 'accepted')

    setFriends(data || [])
    setLoading(false)
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)

    const { data } = await supabase
      .from('profiles')
      .select('id, username, gender, age, is_approved, last_seen')
      .or(`username.ilike.%${query.trim()}%,id.eq.${query.trim()}`)
      .neq('id', profile.id)
      .limit(20)

    setResults(data || [])
    setSearching(false)
  }

  async function addFriend(target) {
    const existing = friends.find(f => f.friend?.id === target.id)
    if (existing) {
      alert('已经是好友了')
      return
    }

    const { error } = await supabase.from('friendships').insert({
      user_id: profile.id,
      friend_id: target.id,
      status: 'accepted'
    })

    if (error) alert('添加失败：' + error.message)
    else {
      alert('已添加好友')
      loadFriends()
    }
  }

  async function startChatWith(target) {
    if (target.gender === profile.gender) {
      alert('同性别禁止聊天，仅支持异性交流')
      return
    }

    const [u1, u2] = [profile.id, target.id].sort()

    let { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('user1_id', u1)
      .eq('user2_id', u2)
      .single()

    if (!conv) {
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({ user1_id: u1, user2_id: u2 })
        .select()
        .single()
      if (error) {
        alert('创建会话失败：' + error.message)
        return
      }
      conv = newConv
    }

    onStartChat(conv, target)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <form onSubmit={handleSearch} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" placeholder="搜索用户名或用户ID" value={query} onChange={e => setQuery(e.target.value)} />
          <button className="btn btn-primary" type="submit" disabled={searching} style={{ whiteSpace: 'nowrap' }}>
            {searching ? '...' : '搜索'}
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>搜索结果</div>
          {results.map(user => (
            <div key={user.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
              borderBottom: '1px solid var(--border)'
            }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: user.gender === 'male' ? 'var(--male)' : 'var(--female)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, color: '#0e0e0e'
                }}>{user.username?.[0]?.toUpperCase()}</div>
                {isOnline(user.last_seen) && (
                  <span style={{
                    position: 'absolute', bottom: 0, right: 0, width: 12, height: 12,
                    borderRadius: '50%', background: '#4fae4e', border: '2px solid var(--bg-secondary)'
                  }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{user.username}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  <span className={`gender-tag ${user.gender === 'male' ? 'gender-male' : 'gender-female'}`}>
                    {user.gender === 'male' ? '♂ 男' : '♀ 女'} · {user.age}岁
                  </span>
                  {isOnline(user.last_seen) && <span style={{ color: '#4fae4e', marginLeft: 6 }}>在线</span>}
                </div>
              </div>
              <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => addFriend(user)}>加好友</button>
              <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => startChatWith(user)}>聊天</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>我的好友</div>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>加载中...</p>
        ) : friends.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>暂无好友，去搜索添加吧</p>
        ) : friends.map(f => (
          <div key={f.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0',
            borderBottom: '1px solid var(--border)', cursor: 'pointer'
          }} onClick={() => startChatWith(f.friend)}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                background: f.friend?.gender === 'male' ? 'var(--male)' : 'var(--female)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, color: '#0e0e0e'
              }}>{f.friend?.username?.[0]?.toUpperCase()}</div>
              {isOnline(f.friend?.last_seen) && (
                <span style={{
                  position: 'absolute', bottom: 0, right: 0, width: 12, height: 12,
                  borderRadius: '50%', background: '#4fae4e', border: '2px solid var(--bg-secondary)'
                }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{f.friend?.username}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                <span className={`gender-tag ${f.friend?.gender === 'male' ? 'gender-male' : 'gender-female'}`}>
                  {f.friend?.gender === 'male' ? '♂ 男' : '♀ 女'} · {f.friend?.age}岁
                </span>
                {isOnline(f.friend?.last_seen) && <span style={{ color: '#4fae4e', marginLeft: 6 }}>在线</span>}
              </div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  )
}
