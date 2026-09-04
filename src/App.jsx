import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Layout from './components/Layout'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 获取当前 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) {
      // 没有 profile，保持在 Auth 流程
      setProfile(null)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)', color: 'var(--text-secondary)'
      }}>
        加载中...
      </div>
    )
  }

  // 未登录或没有完成资料
  if (!session || !profile) {
    return <Auth onAuthSuccess={() => {
      // 重新触发 profile 加载
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) loadProfile(session.user.id)
      })
    }} />
  }

  // 女性未审核通过
  if (profile.gender === 'female' && !profile.is_approved) {
    return (
      <div style={{
        display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, background: 'var(--bg-primary)', padding: 24, textAlign: 'center'
      }}>
        <div style={{ fontSize: 48 }}>⏳</div>
        <h2>账号待审核</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 360 }}>
          你的账号（女性）尚未通过管理员审核。请联系管理员获取授权后再使用。
        </p>
        <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>
          退出登录
        </button>
      </div>
    )
  }

  return <Layout session={session} profile={profile} onProfileUpdate={setProfile} />
}
