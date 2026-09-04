import React, { useEffect, useState } from 'react';
import { supabase } from '../../../src/lib/supabaseClient';

export default function RoomPage({ params }: any) {
  const { id } = params;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    // load existing
    async function load() {
      const { data } = await supabase.from('messages').select('*').eq('room_id', id).order('created_at', { ascending: true });
      setMessages(data || []);
    }
    load();

    const sub = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${id}` }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [id]);

  async function send() {
    if (!text) return;
    await supabase.from('messages').insert([{ room_id: id, content: text }]);
    setText('');
  }

  return (
    <div style={{padding:24}}>
      <h2>Room {id}</h2>
      <div style={{height:300,overflow:'auto',border:'1px solid #ddd',padding:8}}>
        {messages.map(m=> <div key={m.id}><strong>{m.author}</strong>: {m.content}</div>)}
      </div>
      <div>
        <input value={text} onChange={e=>setText(e.target.value)} />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
