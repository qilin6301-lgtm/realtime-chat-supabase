import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../src/lib/supabaseClient';
import { useAuth } from '../../src/lib/useAuth';

export default function RoomsIndex() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [name, setName] = useState('');
  const { user, loading } = useAuth();

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('rooms').select('*').order('created_at', { ascending: false });
      setRooms(data || []);
    }
    load();

    const sub = supabase
      .channel('public:rooms')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rooms' }, payload => {
        setRooms(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, []);

  async function createRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return alert('请先登录');
    const { error } = await supabase.from('rooms').insert([{ name, created_by: user.id }]);
    if (error) return alert(error.message);
    setName('');
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>房间列表</h1>

      <div>
        <form onSubmit={createRoom}>
          <input placeholder="新房间名" value={name} onChange={e => setName(e.target.value)} />
          <button type="submit">创建房间</button>
        </form>
      </div>

      <ul>
        {rooms.map(r => (
          <li key={r.id}>
            <Link href={`/rooms/${r.id}`}>{r.name || r.id}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
