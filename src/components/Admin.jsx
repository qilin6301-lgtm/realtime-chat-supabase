import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Admin({ profile, onBack }) {
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState({ total: 0, male: 0, female: 0, online: 0, pending: 0 })
  const [pendingUsers, setPendingUsers] = useState([])
  const [inviteCodes, setInviteCodes] = useState([])
  const [gifts, setGifts] = useState([])
  const [recharges, setRecharges] = useState([])
  const [consumes, setConsumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [newCode, setNewCode] = useState('')
  const [giftForm, setGiftForm] = useState({ name: '', price: '', icon_url: '' })
  const [rechargeForm, setRechargeForm] = useState({ userId: '', amount: '' })

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    await Promise.all([
      loadStats(),
      loadPending(),
      loadCodes(),
      loadGifts(),
      loadRecharges(),
      loadConsumes()
    ])
    setLoading(false)
  }

  async function loadStats() {
    const { data: profiles } = await supabase.from('profiles').select('id, gender, is_approved, last_seen')
    const list = profiles || []
    const now = Date.now()
    const onlineThreshold = 5 * 60 * 1000 // 5分钟内算在线

    setStats({
      total: list.length,
      male: list.filter(p => p.gender === 'male').length,
      female: list.filter(p => p.gender === 'female').length,
      online: list.filter(p => p.last_seen && now - new Date(p.last_seen).getTime() < onlineThreshold).length,
      pending: list.filter(p => !p.is_approved).length
    })
  }

  async function loadPending() {
    const { data } = await supabase.from('profiles').select('*').eq('is_approved', false).order('created_at', { ascending: false })
    setPendingUsers(data || [])
  }

  async function loadCodes() {
    const { data } = await supabase.from('invite_codes').select('*').order('created_at', { ascending: false }).limit(100)
    setInviteCodes(data || [])
  }

  async function loadGifts() {
    const { data } = await supabase.from('gifts').select('*').order('sort_order', { ascending: true })
    setGifts(data || [])
  }

  async function loadRecharges() {
    const { data } = await supabase.from('recharge_records').select('*, profiles:user_id(username)').order('created_at', { ascending: false }).limit(50)
    setRecharges(data || [])
  }

  async function loadConsumes() {
    const { data } = await supabase.from('consume_records').select('*, profiles:user_id(username)').order('created_at', { ascending: false }).limit(50)
    setConsumes(data || [])
  }

  async function approveUser(userId) {
    await supabase.from('profiles').update({ is_approved: true }).eq('id', userId)
    loadPending()
    loadStats()
  }

  async function generateCode() {
    const code = newCode.trim() || Math.random().toString(36).substring(2, 10).toUpperCase()
    const { error } = await supabase.from('invite_codes').insert({ code, created_by: profile.id })
    if (error) alert(error.message)
    else {
      setNewCode('')
      loadCodes()
    }
  }

  async function saveGift() {
    if (!giftForm.name || !giftForm.price) return alert('请填写名称和价格')
    const { error } = await supabase.from('gifts').insert({
      name: giftForm.name,
      price: parseFloat(giftForm.price),
      icon_url: giftForm.icon_url || null,
      is_active: true
    })
    if (error) alert(error.message)
    else {
      setGiftForm({ name: '', price: '', icon_url: '' })
      loadGifts()
    }
  }

  async function toggleGift(id, active) {
    await supabase.from('gifts').update({ is_active: !active }).eq('id', id)
    loadGifts()
  }

  async function manualRecharge() {
    const amount = parseFloat(rechargeForm.amount)
    if (!rechargeForm.userId || !amount || amount <= 0) return alert('请填写正确信息')

    // 增加余额
    const { data: user } = await supabase.from('profiles').select('balance').eq('id', rechargeForm.userId).single()
    if (!user) return alert('用户不存在')

    await supabase.from('profiles').update({ balance: (parseFloat(user.balance) || 0) + amount }).eq('id', rechargeForm.userId)
    await supabase.from('recharge_records').insert({
      user_id: rechargeForm.userId,
      amount,
      method: 'manual',
      status: 'success',
      remark: '管理员手动充值'
    })

    setRechargeForm({ userId: '', amount: '' })
    loadRecharges()
    alert('充值成功')
  }

  const tabs = [
    { id: 'overview', label: '数据概览' },
    { id: 'pending', label: `待审核 (${stats.pending})` },
    { id: 'codes', label: '邀请码' },
    { id: 'gifts', label: '礼物管理' },
    { id: 'finance', label: '财务记录' }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)' }}>
      {/* 顶部 */}
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-secondary)'
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 22, cursor: 'pointer' }}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 18 }}>管理看板</span>
      </div>

      {/* Tab 导航 */}
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '12px 16px', background: 'transparent', border: 'none',
              color: tab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: tab === t.id ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent'
            }}
          >{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>加载中...</p>
        ) : (
          <>
            {/* 数据概览 */}
            {tab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                <StatCard title="总用户" value={stats.total} color="#2aabee" />
                <StatCard title="男性" value={stats.male} color="#4fc3f7" />
                <StatCard title="女性" value={stats.female} color="#f48fb1" />
                <StatCard title="在线" value={stats.online} color="#4fae4e" />
                <StatCard title="待审核" value={stats.pending} color="#ff9800" />
              </div>
            )}

            {/* 待审核 */}
            {tab === 'pending' && (
              pendingUsers.length === 0 ? (
                <Empty text="暂无待审核用户" />
              ) : pendingUsers.map(u => (
                <div key={u.id} className="card" style={{ padding: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar gender={u.gender} name={u.username} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{u.username}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>♀ {u.age}岁 · {new Date(u.created_at).toLocaleString('zh-CN')}</div>
                  </div>
                  <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => approveUser(u.id)}>批准</button>
                </div>
              ))
            )}

            {/* 邀请码 */}
            {tab === 'codes' && (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input className="input" placeholder="自定义邀请码（可留空自动生成）" value={newCode} onChange={e => setNewCode(e.target.value)} />
                  <button className="btn btn-primary" onClick={generateCode} style={{ whiteSpace: 'nowrap' }}>生成</button>
                </div>
                {inviteCodes.map(c => (
                  <div key={c.code} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <code style={{ fontWeight: 600, fontSize: 15 }}>{c.code}</code>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {c.used_by ? `已使用 · ${new Date(c.used_at).toLocaleDateString('zh-CN')}` : '未使用'}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 12, padding: '2px 10px', borderRadius: 10,
                      background: c.used_by ? 'rgba(229,57,53,0.15)' : 'rgba(79,174,78,0.15)',
                      color: c.used_by ? '#ef9a9a' : '#81c784'
                    }}>{c.used_by ? '已用' : '可用'}</span>
                  </div>
                ))}
              </>
            )}

            {/* 礼物管理 */}
            {tab === 'gifts' && (
              <>
                <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>新增礼物</div>
                  <input className="input" placeholder="礼物名称" value={giftForm.name} onChange={e => setGiftForm({ ...giftForm, name: e.target.value })} style={{ marginBottom: 8 }} />
                  <input className="input" type="number" placeholder="价格（元）" value={giftForm.price} onChange={e => setGiftForm({ ...giftForm, price: e.target.value })} style={{ marginBottom: 8 }} />
                  <input className="input" placeholder="图标 URL（可选，可先上传到 Storage）" value={giftForm.icon_url} onChange={e => setGiftForm({ ...giftForm, icon_url: e.target.value })} style={{ marginBottom: 12 }} />
                  <button className="btn btn-primary" onClick={saveGift}>添加礼物</button>
                </div>
                {gifts.map(g => (
                  <div key={g.id} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                    {g.icon_url ? <img src={g.icon_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} /> : <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎁</div>}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{g.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--accent)' }}>¥{parseFloat(g.price).toFixed(2)}</div>
                    </div>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => toggleGift(g.id, g.is_active)}>
                      {g.is_active ? '下架' : '上架'}
                    </button>
                  </div>
                ))}
              </>
            )}

            {/* 财务 */}
            {tab === 'finance' && (
              <>
                <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>手动充值</div>
                  <input className="input" placeholder="用户 UUID" value={rechargeForm.userId} onChange={e => setRechargeForm({ ...rechargeForm, userId: e.target.value })} style={{ marginBottom: 8 }} />
                  <input className="input" type="number" placeholder="金额" value={rechargeForm.amount} onChange={e => setRechargeForm({ ...rechargeForm, amount: e.target.value })} style={{ marginBottom: 12 }} />
                  <button className="btn btn-primary" onClick={manualRecharge}>确认充值</button>
                </div>

                <div style={{ fontWeight: 600, marginBottom: 8 }}>充值记录</div>
                {recharges.length === 0 ? <Empty text="暂无充值记录" /> : recharges.map(r => (
                  <div key={r.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{r.profiles?.username || r.user_id.slice(0, 8)}</span>
                      <span style={{ color: '#81c784', fontWeight: 600 }}>+¥{parseFloat(r.amount).toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {r.method} · {new Date(r.created_at).toLocaleString('zh-CN')}
                    </div>
                  </div>
                ))}

                <div style={{ fontWeight: 600, margin: '20px 0 8px' }}>消费记录</div>
                {consumes.length === 0 ? <Empty text="暂无消费记录" /> : consumes.map(c => (
                  <div key={c.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{c.profiles?.username || c.user_id.slice(0, 8)}</span>
                      <span style={{ color: '#ef9a9a', fontWeight: 600 }}>-¥{parseFloat(c.amount).toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {c.type} · {c.remark || ''} · {new Date(c.created_at).toLocaleString('zh-CN')}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, color }) {
  return (
    <div className="card" style={{ padding: 18, textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{title}</div>
    </div>
  )
}

function Avatar({ gender, name }) {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      background: gender === 'male' ? 'var(--male)' : 'var(--female)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, color: '#0e0e0e'
    }}>{name?.[0]?.toUpperCase()}</div>
  )
}

function Empty({ text }) {
  return <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>{text}</p>
}
