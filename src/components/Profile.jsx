import { supabase } from '../lib/supabase'

export default function Profile({ profile, session, onProfileUpdate, onOpenAdmin }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // 充值接口预留
  const handleRecharge = () => {
    alert('充值功能预留中，后续可对接支付接口（微信/支付宝/Stripe等）\n当前余额：¥' + (profile.balance || 0).toFixed(2))
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 16px' }}>
      {/* 头像与基本信息 */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: profile.gender === 'male' ? 'var(--male)' : 'var(--female)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 36, color: '#0e0e0e',
          margin: '0 auto 14px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}>
          {profile.username?.[0]?.toUpperCase()}
        </div>
        <h2 style={{ fontSize: 22, marginBottom: 6 }}>{profile.username}</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          <span className={`gender-tag ${profile.gender === 'male' ? 'gender-male' : 'gender-female'}`}>
            {profile.gender === 'male' ? '♂ 男' : '♀ 女'}
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{profile.age} 岁</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
          ID: {profile.id.slice(0, 8)}...
        </p>
      </div>

      {/* 余额与充值 */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>账户余额</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
              ¥{(profile.balance || 0).toFixed(2)}
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleRecharge}>
            充值
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
          * 充值接口已预留，后续可对接真实支付
        </p>
      </div>

      {/* 功能列表 */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
        {profile.is_admin && (
          <button
            onClick={onOpenAdmin}
            style={{
              width: '100%', padding: '14px 18px', background: 'transparent',
              border: 'none', borderBottom: '1px solid var(--border)',
              color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}
          >
            <span>🛠 管理面板</span>
            <span style={{ color: 'var(--text-muted)' }}>›</span>
          </button>
        )}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '14px 18px', background: 'transparent',
            border: 'none', color: 'var(--danger)', textAlign: 'left', cursor: 'pointer'
          }}
        >
          退出登录
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
        交友平台 · 仅支持异性聊天
      </p>
    </div>
  )
}
