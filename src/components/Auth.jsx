import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth({ onAuthSuccess }) {
  const [step, setStep] = useState('email') // email | otp | profile
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [username, setUsername] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // 发送验证码
  const sendOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true }
      })
      if (error) throw error
      setInfo('验证码已发送到邮箱，请查收')
      setStep('otp')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 验证 OTP
  const verifyOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      })
      if (error) throw error

      // 检查是否已有 profile
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (existing) {
        // 已有资料，直接登录成功
        onAuthSuccess?.()
      } else {
        // 新用户，进入完善资料
        setStep('profile')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 完善资料并创建 profile
  const completeProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!gender || !age || !username) {
      setError('请完整填写性别、年龄和用户名')
      setLoading(false)
      return
    }

    const ageNum = parseInt(age, 10)
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
      setError('年龄必须在 18-99 之间')
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('未登录')

      let isApproved = true

      // 女性必须有有效邀请码，否则标记待审核
      if (gender === 'female') {
        if (!inviteCode.trim()) {
          isApproved = false
        } else {
          // 验证邀请码
          const { data: codeRow, error: codeErr } = await supabase
            .from('invite_codes')
            .select('*')
            .eq('code', inviteCode.trim())
            .is('used_by', null)
            .single()

          if (codeErr || !codeRow) {
            setError('邀请码无效或已被使用，请联系管理员获取授权')
            setLoading(false)
            return
          }

          // 标记邀请码已使用
          await supabase
            .from('invite_codes')
            .update({ used_by: user.id, used_at: new Date().toISOString() })
            .eq('code', inviteCode.trim())
        }
      }

      // 创建 profile
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: user.id,
        username: username.trim(),
        gender,
        age: ageNum,
        is_approved: isApproved,
        bio: ''
      })

      if (profileErr) {
        if (profileErr.code === '23505') {
          throw new Error('用户名已被占用，请换一个')
        }
        throw profileErr
      }

      if (!isApproved) {
        alert('注册成功！你的账号正在等待管理员审核授权，审核通过后即可使用。')
      }

      onAuthSuccess?.()
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
      background: 'linear-gradient(145deg, #0e1621 0%, #1a2634 50%, #0e1621 100%)',
      padding: '20px'
    }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 420, padding: '32px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #2aabee, #1e96d1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 28
          }}>💬</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>交友平台</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 14 }}>
            {step === 'email' && '使用邮箱验证码登录 / 注册'}
            {step === 'otp' && '输入邮箱收到的验证码'}
            {step === 'profile' && '完善个人资料（必填）'}
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(229, 57, 53, 0.12)', color: '#ff8a80',
            padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14
          }}>{error}</div>
        )}
        {info && (
          <div style={{
            background: 'rgba(42, 171, 238, 0.12)', color: '#81d4fa',
            padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14
          }}>{info}</div>
        )}

        {step === 'email' && (
          <form onSubmit={sendOtp}>
            <input
              className="input"
              type="email"
              placeholder="请输入邮箱"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ marginBottom: 16 }}
            />
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? '发送中...' : '获取验证码'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verifyOtp}>
            <input
              className="input"
              type="text"
              placeholder="6位验证码"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              required
              maxLength={8}
              style={{ marginBottom: 16, letterSpacing: 4, textAlign: 'center', fontSize: 20 }}
            />
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginBottom: 12 }}>
              {loading ? '验证中...' : '验证并继续'}
            </button>
            <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setStep('email')}>
              返回修改邮箱
            </button>
          </form>
        )}

        {step === 'profile' && (
          <form onSubmit={completeProfile}>
            <input
              className="input"
              type="text"
              placeholder="用户名（唯一）"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              style={{ marginBottom: 12 }}
            />

            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <button
                type="button"
                className={`btn ${gender === 'male' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1 }}
                onClick={() => setGender('male')}
              >♂ 男</button>
              <button
                type="button"
                className={`btn ${gender === 'female' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1 }}
                onClick={() => setGender('female')}
              >♀ 女</button>
            </div>

            <input
              className="input"
              type="number"
              placeholder="年龄（18-99）"
              value={age}
              onChange={e => setAge(e.target.value)}
              min={18}
              max={99}
              required
              style={{ marginBottom: 12 }}
            />

            {gender === 'female' && (
              <div style={{ marginBottom: 12 }}>
                <input
                  className="input"
                  type="text"
                  placeholder="邀请码（女性必填，无码需联系管理员）"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  没有邀请码？注册后将进入待审核状态，请联系管理员授权。
                </p>
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? '提交中...' : '完成注册'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
