import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Admin({ profile, onBack }) {
  const [pendingUsers, setPendingUsers] = useState([])
  const [inviteCodes, setInviteCodes] = useState([])
  const [newCode, setNewCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending') // pending | codes

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    const { data: pending } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_approved', false)
      .order('created_at', { ascending: false })

    const { data: codes } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    setPendingUsers(pending || [])
    setInviteCodes(codes || [])
    setLoading(false)
  }

  async function approveUser(userId) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: true })
      .eq('id', userId)

    if (error) alert('操作失败：' + error.message)
    else {
      alert('已批准')
      loadData()
    }
  }

  async function generateCode() {
    const code = newCode.trim() || Math.random().toString(36).substring(2, 10).toUpperCase()
    const { error } = await supabase.from('invite_codes').insert({
      code,
      created_by: profile.id
    })

    if (error) alert('生成失败：' + error.message)
    else {
      setNewCode('')
      loadData()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 20, cursor: 'pointer' }}>‹</button>
        <span style={{ fontWeight: 600 }}>管理面板</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setTab('pending')}
          style={{
            flex: 1, padding: '12px', background: 'transparent', border: 'none',
            color: tab === 'pending' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: tab === 'pending' ? 600 : 400, cursor: 'pointer',
            borderBottom: tab === 'pending' ? '2px solid var(--accent)' : '2px solid transparent'
          }}
        >待审核用户</button>
        <button
          onClick={() => setTab('codes')}
          style={{
            flex: 1, padding: '12px', background: 'transparent', border: 'none',
            color: tab === 'codes' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: tab === 'codes' ? 600 : 400, cursor: 'pointer',
            borderBottom: tab === 'codes' ? '2px solid var(--accent)' : '2px solid transparent'
          }}
        >邀请码管理</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>加载中...</p>
        ) : tab === 'pending' ? (
          pendingUsers.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>暂无待审核用户</p>
          ) : (
            pendingUsers.map(u => (
              <div key={u.id} className="card" style={{ padding: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'var(--female)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, color: '#0e0e0e'
                }}>
                  {u.username?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{u.username}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    ♀ {u.age}岁 · {new Date(u.created_at).toLocaleDateString('zh-CN')}
                  </div>
                </div>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => approveUser(u.id)}>
                  批准
                </button>
              </div>
            ))
          )
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                className="input"
                placeholder="自定义邀请码（可留空自动生成）"
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
              />
              <button className="btn btn-primary" onClick={generateCode} style={{ whiteSpace: 'nowrap' }}>
                生成
              </button>
            </div>
            {inviteCodes.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>暂无邀请码</p>
            ) : (
              inviteCodes.map(c => (
                <div key={c.code} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <code style={{ fontSize: 15, fontWeight: 600 }}>{c.code}</code>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {c.used_by ? `已使用 · ${new Date(c.used_at).toLocaleDateString('zh-CN')}` : '未使用'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 12, padding: '2px 8px', borderRadius: 10,
                    background: c.used_by ? 'rgba(229,57,53,0.15)' : 'rgba(79,174,78,0.15)',
                    color: c.used_by ? '#ef9a9a' : '#81c784'
                  }}>
                    {c.used_by ? '已用' : '可用'}
                  </span>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
