import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../i18n'

export default function Auth({ onAuthSuccess }) {
  const { t, lang, setLang, LANG_LIST, COUNTRIES, countryName } = useI18n()
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [username, setUsername] = useState('')
  const [country, setCountry] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

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
      setInfo(t('otp_sent'))
      setStep('otp')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()
      if (existing) onAuthSuccess?.()
      else setStep('profile')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const completeProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!gender || !age || !username || !country) {
      setError(t('required_fields'))
      setLoading(false)
      return
    }
    const ageNum = parseInt(age, 10)
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
      setError(t('age_range'))
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      let isApproved = true
      if (gender === 'female') {
        if (!inviteCode.trim()) {
          isApproved = false
        } else {
          const { data: codeRow, error: codeErr } = await supabase
            .from('invite_codes')
            .select('*')
            .eq('code', inviteCode.trim())
            .is('used_by', null)
            .single()
          if (codeErr || !codeRow) {
            setError(t('invite_hint'))
            setLoading(false)
            return
          }
          await supabase
            .from('invite_codes')
            .update({ used_by: user.id, used_at: new Date().toISOString() })
            .eq('code', inviteCode.trim())
        }
      }

      const { error: profileErr } = await supabase.from('profiles').insert({
        id: user.id,
        username: username.trim(),
        gender,
        age: ageNum,
        country,
        is_approved: isApproved,
        bio: ''
      })

      if (profileErr) {
        if (profileErr.code === '23505') throw new Error('Username taken')
        throw profileErr
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
      display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(145deg, #0e1621 0%, #1a2634 50%, #0e1621 100%)', padding: 20
    }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 420, padding: '32px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <select
            value={lang}
            onChange={e => setLang(e.target.value)}
            style={{
              background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
              border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 13
            }}
          >
            {LANG_LIST.map(l => (
              <option key={l.code} value={l.code}>{l.native}</option>
            ))}
          </select>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #2aabee, #1e96d1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 28
          }}>💬</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>{t('app_name')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 14 }}>
            {step === 'email' && t('get_otp')}
            {step === 'otp' && t('verify_otp')}
            {step === 'profile' && t('complete_profile')}
          </p>
        </div>

        {error && <div style={{ background: 'rgba(229,57,53,0.12)', color: '#ff8a80', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
        {info && <div style={{ background: 'rgba(42,171,238,0.12)', color: '#81d4fa', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{info}</div>}

        {step === 'email' && (
          <form onSubmit={sendOtp}>
            <input className="input" type="email" placeholder={t('email')} value={email} onChange={e => setEmail(e.target.value)} required style={{ marginBottom: 16 }} />
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? t('loading') : t('get_otp')}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verifyOtp}>
            <input className="input" type="text" placeholder="OTP" value={otp} onChange={e => setOtp(e.target.value)} required maxLength={8} style={{ marginBottom: 16, letterSpacing: 4, textAlign: 'center', fontSize: 20 }} />
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginBottom: 12 }}>
              {loading ? t('loading') : t('verify_otp')}
            </button>
            <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setStep('email')}>{t('back')}</button>
          </form>
        )}

        {step === 'profile' && (
          <form onSubmit={completeProfile}>
            <input className="input" type="text" placeholder={t('username')} value={username} onChange={e => setUsername(e.target.value)} required style={{ marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <button type="button" className={`btn ${gender === 'male' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setGender('male')}>♂ {t('male')}</button>
              <button type="button" className={`btn ${gender === 'female' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setGender('female')}>♀ {t('female')}</button>
            </div>
            <input className="input" type="number" placeholder={t('age')} value={age} onChange={e => setAge(e.target.value)} min={18} max={99} required style={{ marginBottom: 12 }} />
            <select
              className="input"
              value={country}
              onChange={e => setCountry(e.target.value)}
              required
              style={{ marginBottom: 12 }}
            >
              <option value="">{t('select_country')}</option>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{countryName(c.code)}</option>
              ))}
            </select>
            {gender === 'female' && (
              <div style={{ marginBottom: 12 }}>
                <input className="input" type="text" placeholder={t('invite_code')} value={inviteCode} onChange={e => setInviteCode(e.target.value)} />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{t('invite_hint')}</p>
              </div>
            )}
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? t('loading') : t('submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
