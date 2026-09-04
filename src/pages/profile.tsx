import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/useAuth';

export default function ProfilePage() {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setUsername(data.username || '');
        setAvatarUrl(data.avatar_url || '');
      }
    }
    load();
  }, [user]);

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const filePath = `avatars/${user.id}/${Date.now()}_${file.name}`;
    setUploading(true);
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
    if (uploadError) {
      alert('上传失败: ' + uploadError.message);
      setUploading(false);
      return;
    }
    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = publicData?.publicUrl;
    await supabase.from('profiles').upsert({ id: user.id, username, avatar_url: publicUrl });
    setAvatarUrl(publicUrl || '');
    setUploading(false);
  }

  async function save() {
    if (!user) return;
    await supabase.from('profiles').upsert({ id: user.id, username, avatar_url: avatarUrl });
    alert('已保存');
  }

  if (!user) return <div style={{ padding: 24 }}>请先登录</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>个人资料</h1>
      <div>
        <label>用户名</label>
        <input value={username} onChange={e => setUsername(e.target.value)} />
      </div>

      <div>
        <label>头像</label>
        <div>
          {avatarUrl && <img src={avatarUrl} alt="avatar" width={80} height={80} />}
        </div>
        <input type="file" accept="image/*" onChange={uploadAvatar} />
        {uploading && <div>上传中...</div>}
      </div>

      <button onClick={save}>保存</button>
    </div>
  );
}
