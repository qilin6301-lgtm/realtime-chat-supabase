import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../i18n'

const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma'
]

export default function Profile({ profile, session, onProfileUpdate, onOpenAdmin }) {
  const { t, lang, setLang, LANG_LIST, countryName, COUNTRIES } = useI18n()
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

  const handleLogout = async () => { await supabase.auth.signOut() }

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
    if (!file.type.startsWith('image/')) return alert('Image only')
    if (file.size > 2 * 1024 * 1024) return alert('Max 2MB')
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`
    await supabase.storage.from('avatars').remove([path])
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) {
      alert(error.message)
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await setAvatar(publicUrl + '?t=' + Date.now())
    setUploading(false)
    e.target.value = ''
  }

  async function updateCountry(code) {
    const { error } = await supabase.from('profiles').update({ country: code }).eq('id', profile.id)
    if (!error) onProfileUpdate({ ...profile, country: code })
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 14 }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }} />
          ) : (
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              background: profile.gender === 'male' ? 'var(--male)' : 'var(--female)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 36, color: '#0e0e0e', boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
            }}>{profile.username?.[0]?.toUpperCase()}</div>
          )}
          <span style={{ position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: '#4fae4e', border: '2px solid var(--bg-secondary)' }} />
        </div>

        <button className="btn btn-ghost" style={{ marginBottom: 12, fontSize: 13 }} onClick={() => setShowAvatarPicker(!showAvatarPicker)}>
          {uploading ? t('loading') : t('change_avatar')}
        </button>

        {showAvatarPicker && (
          <div className="card" style={{ padding: 16, marginBottom: 16, textAlign: 'left' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>{t('system_avatars')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              {DEFAULT_AVATARS.map((url, i) => (
                <img key={i} src={url} alt="" onClick={() => setAvatar(url)} style={{
                  width: 52, height: 52, borderRadius: '50%', cursor: 'pointer',
                  border: profile.avatar_url === url ? '2px solid var(--accent)' : '2px solid transparent', objectFit: 'cover'
                }} />
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => fileRef.current?.click()} disabled={uploading}>
              {t('upload_avatar')}
            </button>
            <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />
          </div>
        )}

        <h2 style={{ fontSize: 22, marginBottom: 6 }}>{profile.username}</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className={`gender-tag ${profile.gender === 'male' ? 'gender-male' : 'gender-female'}`}>
            {profile.gender === 'male' ? '♂ ' + t('male') : '♀ ' + t('female')}
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('years_old', { age: profile.age })}</span>
          {profile.country && (
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>🌍 {countryName(profile.country)}</span>
          )}
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8, wordBreak: 'break-all' }}>
          {t('id_label')}: {profile.id}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
          {t('device_limit')}: {profile.max_devices || 1} {t('devices_unit')}
        </p>
      </div>

      {/* 语言 */}
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{t('language')}</div>
        <select
          className="input"
          value={lang}
          onChange={e => setLang(e.target.value)}
        >
          {LANG_LIST.map(l => (
            <option key={l.code} value={l.code}>{l.native} ({l.name})</option>
          ))}
        </select>
      </div>

      {/* 国家 */}
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{t('country')}</div>
        <select
          className="input"
          value={profile.country || ''}
          onChange={e => updateCountry(e.target.value)}
        >
          <option value="">{t('select_country')}</option>
          {COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>{countryName(c.code)}</option>
          ))}
        </select>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('balance')}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
              ¥{(parseFloat(profile.balance) || 0).toFixed(2)}
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => alert(t('recharge'))}>{t('recharge')}</button>
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
            <span>🛠 {t('admin_panel')}</span>
            <span style={{ color: 'var(--text-muted)' }}>›</span>
          </button>
        )}
        <button onClick={handleLogout} style={{
          width: '100%', padding: '14px 18px', background: 'transparent',
          border: 'none', color: 'var(--danger)', textAlign: 'left', cursor: 'pointer'
        }}>{t('logout')}</button>
      </div>
    </div>
  )
}
