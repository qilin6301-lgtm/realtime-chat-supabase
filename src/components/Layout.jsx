import { useState } from 'react'
import Square from './Square'
import Chats from './Chats'
import ChatWindow from './ChatWindow'
import Friends from './Friends'
import Profile from './Profile'
import Admin from './Admin'

const NAV_ITEMS = [
  { id: 'square', label: '广场', icon: '🏠' },
  { id: 'chats', label: '消息', icon: '💬' },
  { id: 'friends', label: '好友', icon: '👥' },
  { id: 'profile', label: '我的', icon: '👤' },
]

export default function Layout({ session, profile, onProfileUpdate }) {
  const [activeTab, setActiveTab] = useState('chats')
  const [activeConversation, setActiveConversation] = useState(null) // { id, otherUser }

  const openChat = (conversation, otherUser) => {
    setActiveConversation({ ...conversation, otherUser })
    setActiveTab('chats')
  }

  const closeChat = () => setActiveConversation(null)

  return (
    <div className="app-layout">
      {/* 左侧边栏（桌面） / 主视图（移动） */}
      <div className="sidebar" style={{ display: activeConversation ? 'none' : 'flex' }}>
        {/* 顶部用户信息 */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: profile.gender === 'male' ? 'var(--male)' : 'var(--female)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 18, color: '#0e0e0e'
          }}>
            {profile.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.username}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              <span className={`gender-tag ${profile.gender === 'male' ? 'gender-male' : 'gender-female'}`}>
                {profile.gender === 'male' ? '♂ 男' : '♀ 女'} · {profile.age}岁
              </span>
            </div>
          </div>
        </div>

        {/* 内容区 */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'square' && <Square profile={profile} />}
          {activeTab === 'chats' && (
            <Chats
              profile={profile}
              onSelectConversation={openChat}
            />
          )}
          {activeTab === 'friends' && (
            <Friends
              profile={profile}
              onStartChat={openChat}
            />
          )}
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

        {/* 底部导航 */}
        <div style={{
          display: 'flex',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-secondary)'
        }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setActiveConversation(null) }}
              style={{
                flex: 1,
                padding: '12px 0',
                background: 'transparent',
                border: 'none',
                color: activeTab === item.id ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontWeight: activeTab === item.id ? 600 : 400
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 右侧聊天窗口 */}
      <div className="main-content" style={{ display: activeConversation ? 'flex' : 'none' }}>
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            profile={profile}
            onBack={closeChat}
          />
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', flexDirection: 'column', gap: 12
          }}>
            <div style={{ fontSize: 64, opacity: 0.3 }}>💬</div>
            <p>选择一个会话开始聊天</p>
            <p style={{ fontSize: 13 }}>仅支持异性聊天</p>
          </div>
        )}
      </div>

      {/* 桌面端默认右侧占位 */}
      {!activeConversation && (
        <div className="main-content" style={{
          display: window.innerWidth > 768 ? 'flex' : 'none',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', flexDirection: 'column', gap: 12
        }}>
          <div style={{ fontSize: 64, opacity: 0.3 }}>💕</div>
          <p>欢迎来到交友平台</p>
          <p style={{ fontSize: 13 }}>选择左侧功能开始探索</p>
        </div>
      )}
    </div>
  )
}
