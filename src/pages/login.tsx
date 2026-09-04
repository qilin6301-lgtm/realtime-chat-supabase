import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const router = useRouter();
  const { user, loading } = useAuth();

  if (!loading && user) {
    router.push('/rooms');
    return null;
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
    else router.push('/rooms');
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>登录</h1>
      <form onSubmit={handleSignIn}>
        <div>
          <input placeholder="邮箱" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <input placeholder="密码" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button type="submit">登录</button>
      </form>
      <p>{msg}</p>
      <p>没有账号？请先在首页使用邮箱注册（验证码注册）。</p>
    </div>
  );
}
