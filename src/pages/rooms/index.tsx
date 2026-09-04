import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../src/lib/supabaseClient';
import { useAuth } from '../../src/lib/useAuth';

export default function RoomsIndex() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const { user } = useAuth();

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
    // create room with created_by = user.id
    const { data, error } = await supabase.from('rooms').insert([{ name, is_public: isPublic, created_by: user.id }]).select().single();
    if (error) return alert(error.message);
    const room = data;
    // add creator as admin to rooms_members
    await supabase.from('rooms_members').insert([{ room_id: room.id, user_id: user.id, role: 'admin' }]);
    setName('');
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>房间列表</h1>

      <div>
        <form onSubmit={createRoom}>
          <input placeholder="新房间名" value={name} onChange={e => setName(e.target.value)} />
          <label style={{ marginLeft: 8 }}>
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} /> 公共房间
          </label>
          <button type="submit">创建房间</button>
        </form>
      </div>

      <ul>
        {rooms.map(r => (
          <li key={r.id}>
            <Link href={`/rooms/${r.id}`}>{r.name || r.id} {r.is_public ? '' : '(私有)'}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
