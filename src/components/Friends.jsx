import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../i18n'

function isOnline(lastSeen) {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000
}

export default function Friends({ profile, onStartChat }) {
  const { t, countryName } = useI18n()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => { loadFriends() }, [])

  async function loadFriends() {
    setLoading(true)
    const { data } = await supabase
      .from('friendships')
      .select(`id, status, created_at, friend:friend_id ( id, username, gender, age, last_seen, country, avatar_url )`)
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
      .select('id, username, gender, age, is_approved, last_seen, country, avatar_url')
      .or(`username.ilike.%${query.trim()}%,id.eq.${query.trim()}`)
      .neq('id', profile.id)
      .limit(20)
    setResults(data || [])
    setSearching(false)
  }

  async function addFriend(target) {
    if (friends.find(f => f.friend?.id === target.id)) {
      alert(t('already_friend'))
      return
    }
    const { error } = await supabase.from('friendships').insert({
      user_id: profile.id,
      friend_id: target.id,
      status: 'accepted'
    })
    if (error) alert(error.message)
    else loadFriends()
  }

  async function removeFriend(friendshipId, e) {
    e?.stopPropagation()
    if (!confirm(t('remove_friend_confirm'))) return
    // 双向删除
    const f = friends.find(x => x.id === friendshipId)
    if (f?.friend?.id) {
      await supabase.from('friendships').delete().eq('user_id', profile.id).eq('friend_id', f.friend.id)
      await supabase.from('friendships').delete().eq('user_id', f.friend.id).eq('friend_id', profile.id)
    } else {
      await supabase.from('friendships').delete().eq('id', friendshipId)
    }
    loadFriends()
  }

  async function startChatWith(target) {
    if (target.gender === profile.gender) {
      alert(t('same_gender_block'))
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
        alert(error.message)
        return
      }
      conv = newConv
    }
    onStartChat(conv, target)
  }

  function UserRow({ user, extra }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ position: 'relative' }}>
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: user.gender === 'male' ? 'var(--male)' : 'var(--female)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0e0e0e'
            }}>{user.username?.[0]?.toUpperCase()}</div>
          )}
          {isOnline(user.last_seen) && (
            <span style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: '#4fae4e', border: '2px solid var(--bg-secondary)' }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{user.username}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <span className={`gender-tag ${user.gender === 'male' ? 'gender-male' : 'gender-female'}`}>
              {user.gender === 'male' ? '♂' : '♀'} {t('years_old', { age: user.age })}
            </span>
            {user.country && <span style={{ marginLeft: 6 }}>· {countryName(user.country)}</span>}
            {isOnline(user.last_seen) && <span style={{ color: '#4fae4e', marginLeft: 6 }}>{t('online')}</span>}
          </div>
        </div>
        {extra}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <form onSubmit={handleSearch} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" placeholder={t('search_user')} value={query} onChange={e => setQuery(e.target.value)} />
          <button className="btn btn-primary" type="submit" disabled={searching} style={{ whiteSpace: 'nowrap' }}>
            {searching ? '...' : t('search')}
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{t('search_results')}</div>
          {results.map(user => (
            <UserRow
              key={user.id}
              user={user}
              extra={(
                <>
                  <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => addFriend(user)}>{t('add_friend')}</button>
                  <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => startChatWith(user)}>{t('chat')}</button>
                </>
              )}
            />
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{t('my_friends')}</div>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>{t('loading')}</p>
        ) : friends.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>{t('no_friends')}</p>
        ) : friends.map(f => (
          <div key={f.id} style={{ cursor: 'pointer' }} onClick={() => startChatWith(f.friend)}>
            <UserRow
              user={f.friend || {}}
              extra={(
                <button
                  className="btn btn-ghost"
                  style={{ padding: '4px 8px', fontSize: 11, color: 'var(--danger)' }}
                  onClick={(e) => removeFriend(f.id, e)}
                >{t('remove_friend')}</button>
              )}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
