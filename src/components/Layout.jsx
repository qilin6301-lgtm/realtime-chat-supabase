import { useState, useEffect } from 'react'
import { useI18n } from '../i18n'
import { ensureNotificationPermission } from '../lib/notify'
import Square from './Square'
import Chats from './Chats'
import ChatWindow from './ChatWindow'
import Friends from './Friends'
import Profile from './Profile'
import Admin from './Admin'

export default function Layout({ session, profile, onProfileUpdate }) {
  const { t, countryName } = useI18n()
  const [activeTab, setActiveTab] = useState('chats')
  const [activeConversation, setActiveConversation] = useState(null)

  useEffect(() => {
    ensureNotificationPermission()
  }, [])

  const openChat = (conversation, otherUser) => {
    setActiveConversation({ ...conversation, otherUser })
    setActiveTab('chats')
  }

  const closeChat = () => setActiveConversation(null)

  const NAV_ITEMS = [
    { id: 'square', label: t('square'), icon: '🏠' },
    { id: 'chats', label: t('chats'), icon: '💬' },
    { id: 'friends', label: t('friends'), icon: '👥' },
    { id: 'profile', label: t('profile'), icon: '👤' }
  ]

  return (
    <div className="app-layout">
      <div className="sidebar" style={{ display: activeConversation ? 'none' : 'flex' }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: profile.gender === 'male' ? 'var(--male)' : 'var(--female)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 18, color: '#0e0e0e'
            }}>{profile.username?.[0]?.toUpperCase() || '?'}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.username}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              <span className={`gender-tag ${profile.gender === 'male' ? 'gender-male' : 'gender-female'}`}>
                {profile.gender === 'male' ? '♂' : '♀'} {t('years_old', { age: profile.age })}
              </span>
              {profile.country && <span style={{ marginLeft: 6 }}>· {countryName(profile.country)}</span>}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'square' && <Square profile={profile} />}
          {activeTab === 'chats' && <Chats profile={profile} onSelectConversation={openChat} />}
          {activeTab === 'friends' && <Friends profile={profile} onStartChat={openChat} />}
          {activeTab === 'profile' && (
            <Profile profile={profile} session={session} onProfileUpdate={onProfileUpdate} onOpenAdmin={() => setActiveTab('admin')} />
          )}
          {activeTab === 'admin' && profile.is_admin && (
            <Admin profile={profile} onBack={() => setActiveTab('profile')} />
          )}
        </div>

        <div style={{ display: 'flex', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setActiveConversation(null) }}
              style={{
                flex: 1, padding: '12px 0', background: 'transparent', border: 'none',
                color: activeTab === item.id ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: activeTab === item.id ? 600 : 400
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="main-content" style={{ display: activeConversation ? 'flex' : 'none' }}>
        {activeConversation && (
          <ChatWindow conversation={activeConversation} profile={profile} onBack={closeChat} />
        )}
      </div>

      {!activeConversation && (
        <div className="main-content" style={{
          display: typeof window !== 'undefined' && window.innerWidth > 768 ? 'flex' : 'none',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', flexDirection: 'column', gap: 12
        }}>
          <div style={{ fontSize: 64, opacity: 0.3 }}>💕</div>
          <p>{t('welcome')}</p>
          <p style={{ fontSize: 13 }}>{t('only_opposite')}</p>
        </div>
      )}
    </div>
  )
}
