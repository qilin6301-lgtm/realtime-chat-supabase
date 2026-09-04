import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username || email.split('@')[0] }
          }
        })
        if (error) throw error
        if (data.user) {
          alert('注册成功！请检查邮箱确认（如果开启了邮箱确认）或直接登录。')
          setIsLogin(true)
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
    }}>
      <form onSubmit={handleAuth} style={{
        background: '#1e1e2e',
        padding: '2.5rem',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.8rem' }}>
          {isLogin ? '登录' : '注册'} 即时通讯
        </h1>

        {!isLogin && (
          <input
            type="text"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
          />
        )}

        <input
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={inputStyle}
        />

        {error && <p style={{ color: '#ff6b6b', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
        </button>

        <p style={{ textAlign: 'center', marginTop: '1.2rem', color: '#aaa' }}>
          {isLogin ? '没有账号？' : '已有账号？'}
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError('') }}
            style={{ background: 'none', border: 'none', color: '#7c9cff', cursor: 'pointer', marginLeft: '0.5rem' }}
          >
            {isLogin ? '去注册' : '去登录'}
          </button>
        </p>
      </form>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '0.85rem 1rem',
  marginBottom: '1rem',
  borderRadius: '8px',
  border: '1px solid #333',
  background: '#2a2a3e',
  color: '#fff',
  fontSize: '1rem',
  outline: 'none'
}

const buttonStyle = {
  width: '100%',
  padding: '0.9rem',
  borderRadius: '8px',
  border: 'none',
  background: '#5b7cfa',
  color: '#fff',
  fontSize: '1rem',
  fontWeight: '600',
  cursor: 'pointer'
}
