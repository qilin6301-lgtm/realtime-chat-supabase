import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { registerDeviceSession, checkDeviceValid, heartbeatDevice } from './lib/device'
import Auth from './components/Auth'
import Layout from './components/Layout'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deviceError, setDeviceError] = useState('')

  useEffect(() => {
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
        setDeviceError('')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // 设备心跳 + 校验
  useEffect(() => {
    if (!profile) return

    const tick = async () => {
      const valid = await checkDeviceValid(supabase, profile.id)
      if (!valid) {
        setDeviceError('该账号已在其他设备登录，当前设备已被踢出。请重新登录或联系管理员增加设备上限。')
        await supabase.auth.signOut()
        return
      }
      await heartbeatDevice(supabase, profile.id)
      await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', profile.id)
    }

    tick()
    const timer = setInterval(tick, 60 * 1000)
    return () => clearInterval(timer)
  }, [profile?.id])

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) {
      setProfile(null)
      setLoading(false)
      return
    }

    // 注册设备会话
    const maxDevices = data.max_devices || 1
    const result = await registerDeviceSession(supabase, userId, maxDevices)
    if (!result.ok) {
      setDeviceError(result.message || '设备注册失败')
      setLoading(false)
      return
    }

    setProfile(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)', color: 'var(--text-secondary)'
      }}>加载中...</div>
    )
  }

  if (deviceError) {
    return (
      <div style={{
        display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, background: 'var(--bg-primary)', padding: 24, textAlign: 'center'
      }}>
        <div style={{ fontSize: 48 }}>📱</div>
        <h2>设备限制</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 360 }}>{deviceError}</p>
        <button className="btn btn-primary" onClick={() => { setDeviceError(''); window.location.reload() }}>
          重新登录
        </button>
      </div>
    )
  }

  if (!session || !profile) {
    return <Auth onAuthSuccess={() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) loadProfile(session.user.id)
      })
    }} />
  }

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
        <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>退出登录</button>
      </div>
    )
  }

  return <Layout session={session} profile={profile} onProfileUpdate={setProfile} />
}
