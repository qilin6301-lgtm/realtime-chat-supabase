import React, { useState } from 'react';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'send'|'verify'>('send');
  const [msg, setMsg] = useState('');

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const res = await fetch('/api/auth/send-code', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
    if (res.ok) { setStep('verify'); setMsg('验证码已发送'); } else { setMsg('发送失败'); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const res = await fetch('/api/auth/verify-code', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, code, password }) });
    if (res.ok) { setMsg('注册成功，去聊天页面'); } else { const j = await res.json(); setMsg(j.error || '验证失败'); }
  }

  return (
    <div style={{padding:24}}>
      <h1>Realtime Chat - 注册</h1>
      {step === 'send' && (
        <form onSubmit={sendCode}>
          <input placeholder="邮箱" value={email} onChange={e=>setEmail(e.target.value)} />
          <button type="submit">发送验证码</button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={verify}>
          <div>
            <input placeholder="验证码" value={code} onChange={e=>setCode(e.target.value)} />
          </div>
          <div>
            <input placeholder="密码" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          <button type="submit">验证并注册</button>
        </form>
      )}

      <p>{msg}</p>
    </div>
  );
}
