import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// 系统默认头像（使用 DiceBear 或纯色+字母，这里用可靠的公开头像服务 + 本地色块备选）
const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
]

export default function Profile({ profile, session, onProfileUpdate, onOpenAdmin }) {
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    const updateSeen = () => {
      supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', profile.id)
    }
    updateSeen()
    const timer = setInterval(updateSeen, 60 * 1000)
    return () => clearInterval(timer)
  }, [profile.id])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleRecharge = () => {
    alert('充值功能预留中。\n当前余额：¥' + (parseFloat(profile.balance) || 0).toFixed(2))
  }

  async function setAvatar(url) {
    const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
    if (error) alert(error.message)
    else {
      onProfileUpdate({ ...profile, avatar_url: url })
      setShowAvatarPicker(false)
    }
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return alert('请选择图片')
    if (file.size > 2 * 1024 * 1024) return alert('头像不能超过 2MB')

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`

    // 覆盖上传
    await supabase.storage.from('avatars').remove([path])
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) {
      alert('上传失败：' + error.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    // 加时间戳防缓存
    await setAvatar(publicUrl + '?t=' + Date.now())
    setUploading(false)
    e.target.value = ''
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 14 }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" style={{
              width: 88, height: 88, borderRadius: '50%', objectFit: 'cover',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
            }} />
          ) : (
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              background: profile.gender === 'male' ? 'var(--male)' : 'var(--female)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 36, color: '#0e0e0e',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
            }}>{profile.username?.[0]?.toUpperCase()}</div>
          )}
          <span style={{
            position: 'absolute', bottom: 2, right: 2, width: 16, height: 16,
            borderRadius: '50%', background: '#4fae4e', border: '2px solid var(--bg-secondary)'
          }} />
        </div>

        <button className="btn btn-ghost" style={{ marginBottom: 12, fontSize: 13 }} onClick={() => setShowAvatarPicker(!showAvatarPicker)}>
          {uploading ? '上传中...' : '更换头像'}
        </button>

        {showAvatarPicker && (
          <div className="card" style={{ padding: 16, marginBottom: 16, textAlign: 'left' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>选择系统默认头像</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              {DEFAULT_AVATARS.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  onClick={() => setAvatar(url)}
                  style={{
                    width: 52, height: 52, borderRadius: '50%', cursor: 'pointer',
                    border: profile.avatar_url === url ? '2px solid var(--accent)' : '2px solid transparent',
                    objectFit: 'cover'
                  }}
                />
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => fileRef.current?.click()} disabled={uploading}>
              上传自定义头像
            </button>
            <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />
          </div>
        )}

        <h2 style={{ fontSize: 22, marginBottom: 6 }}>{profile.username}</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          <span className={`gender-tag ${profile.gender === 'male' ? 'gender-male' : 'gender-female'}`}>
            {profile.gender === 'male' ? '♂ 男' : '♀ 女'}
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{profile.age} 岁</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8, wordBreak: 'break-all' }}>
          ID: {profile.id}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
          设备上限：{profile.max_devices || 1} 台
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
        <button onClick={handleLogout} style={{
          width: '100%', padding: '14px 18px', background: 'transparent',
          border: 'none', color: 'var(--danger)', textAlign: 'left', cursor: 'pointer'
        }}>退出登录</button>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
        交友平台 · 异性聊天 · 表情礼物 · 设备限制
      </p>
    </div>
  )
}
