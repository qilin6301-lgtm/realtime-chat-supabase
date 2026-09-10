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
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)

  useEffect(() => {
    ensureNotificationPermission()
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
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

  // 移动端：打开聊天时隐藏侧边栏；桌面：侧边栏始终可见（Telegram 双栏）
  const hideSidebar = isMobile && !!activeConversation
  const showChatPane = !!activeConversation || !isMobile

  return (
    <div className="app-layout">
      <div className="sidebar" style={{ display: hideSidebar ? 'none' : 'flex' }}>
        <div className="sidebar-header">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="avatar-img sm" />
          ) : (
            <div
              className="avatar-fallback sm"
              style={{ background: profile.gender === 'male' ? 'var(--male)' : 'var(--female)' }}
            >
              {profile.username?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-username">{profile.username}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              <span className={`gender-tag ${profile.gender === 'male' ? 'gender-male' : 'gender-female'}`}>
                {profile.gender === 'male' ? '♂' : '♀'} {t('years_old', { age: profile.age })}
              </span>
              {profile.country && <span style={{ marginLeft: 6 }}>· {countryName(profile.country)}</span>}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'square' && <Square profile={profile} />}
          {activeTab === 'chats' && (
            <Chats
              profile={profile}
              onSelectConversation={openChat}
              activeId={activeConversation?.id}
            />
          )}
          {activeTab === 'friends' && <Friends profile={profile} onStartChat={openChat} />}
          {activeTab === 'profile' && (
            <Profile
              profile={profile}
              session={session}
              onProfileUpdate={onProfileUpdate}
              onOpenAdmin={() => setActiveTab('admin')}
            />
          )}
          {activeTab === 'admin' && profile.is_admin && (
            <Admin profile={profile} onBack={() => setActiveTab('profile')} />
          )}
        </div>

        <nav className="bottom-tabs">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              type="button"
              className={`nav-tab ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id)
                if (isMobile) setActiveConversation(null)
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="main-content" style={{ display: showChatPane ? 'flex' : 'none' }}>
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onBack={closeChat}
          />
        ) : (
          <div className="welcome-pane">
            <div className="welcome-icon">💕</div>
            <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{t('welcome')}</p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 280, textAlign: 'center' }}>
              {t('select_chat')}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('only_opposite')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
