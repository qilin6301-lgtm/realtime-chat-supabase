import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Profile({ profile, session, onProfileUpdate, onOpenAdmin }) {
  // 定期更新 last_seen 保持在线状态
  useEffect(() => {
    const updateSeen = () => {
      supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', profile.id)
    }
    updateSeen()
    const timer = setInterval(updateSeen, 60 * 1000) // 每分钟心跳
    return () => clearInterval(timer)
  }, [profile.id])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleRecharge = () => {
    alert('充值功能预留中。\n当前余额：¥' + (parseFloat(profile.balance) || 0).toFixed(2) + '\n\n正式上线后可对接微信/支付宝/Stripe 等支付。')
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: profile.gender === 'male' ? 'var(--male)' : 'var(--female)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 36, color: '#0e0e0e',
          margin: '0 auto 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          position: 'relative'
        }}>
          {profile.username?.[0]?.toUpperCase()}
          <span style={{
            position: 'absolute', bottom: 2, right: 2, width: 16, height: 16,
            borderRadius: '50%', background: '#4fae4e', border: '2px solid var(--bg-secondary)'
          }} title="在线" />
        </div>
        <h2 style={{ fontSize: 22, marginBottom: 6 }}>{profile.username}</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          <span className={`gender-tag ${profile.gender === 'male' ? 'gender-male' : 'gender-female'}`}>
            {profile.gender === 'male' ? '♂ 男' : '♀ 女'}
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{profile.age} 岁</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
          ID: {profile.id}
        </p>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>账户余额</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
              ¥{(parseFloat(profile.balance) || 0).toFixed(2)}
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleRecharge}>充值</button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
          * 充值接口已预留，管理员可在后台手动充值
        </p>
      </div>

      <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
        {profile.is_admin && (
          <button onClick={onOpenAdmin} style={{
            width: '100%', padding: '14px 18px', background: 'transparent',
            border: 'none', borderBottom: '1px solid var(--border)',
            color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span>🛠 管理看板</span>
            <span style={{ color: 'var(--text-muted)' }}>›</span>
          </button>
        )}
        <button onClick={handleLogout} style={
          { width: '100%', padding: '14px 18px', background: 'transparent',
            border: 'none', color: 'var(--danger)', textAlign: 'left', cursor: 'pointer' }
        }>退出登录</button>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
        交友平台 · 仅支持异性聊天 · 支持表情与礼物
      </p>
    </div>
  )
}
