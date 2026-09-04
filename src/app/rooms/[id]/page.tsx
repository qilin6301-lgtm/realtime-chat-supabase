import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../src/lib/supabaseClient';
import { useAuth } from '../../../src/lib/useAuth';

export default function RoomPage({ params }: any) {
  const { id } = params;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 30; // configurable
  const earliestRef = useRef<Date | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    async function loadInitial() {
      setLoading(true);
      // fetch latest pageSize messages (most recent)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', id)
        .order('created_at', { ascending: false })
        .limit(pageSize);

      if (error) {
        console.error('load messages error', error);
        setLoading(false);
        return;
      }
      if (!mounted) return;

      const msgs = (data || []).reverse(); // oldest -> newest
      setMessages(msgs);
      earliestRef.current = msgs.length ? new Date(msgs[0].created_at) : null;
      setHasMore((data || []).length === pageSize);
      setLoading(false);
    }
    loadInitial();

    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${id}` }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      mounted = false;
      channel.unsubscribe();
    };
  }, [id]);

  async function loadOlder() {
    if (!earliestRef.current) return;
    const before = earliestRef.current.toISOString();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', id)
      .lt('created_at', before)
      .order('created_at', { ascending: false })
      .limit(pageSize);

    if (error) return console.error(error);
    const msgs = (data || []).reverse();
    if (msgs.length) {
      setMessages(prev => [...msgs, ...prev]);
      earliestRef.current = new Date(msgs[0].created_at);
    }
    setHasMore((data || []).length === pageSize);
  }

  async function send() {
    if (!text) return;
    try {
      await supabase.from('messages').insert([{ room_id: id, content: text, author: user?.id }]);
      setText('');
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Room {id}</h2>
      <div>
        {hasMore && <button onClick={loadOlder}>加载更早消息</button>}
      </div>
      <div style={{ height: 400, overflow: 'auto', border: '1px solid #ddd', padding: 8 }}>
        {messages.map(m => (
          <div key={m.id}><strong>{m.author}</strong>: {m.content}</div>
        ))}
      </div>
      <div>
        <input value={text} onChange={e => setText(e.target.value)} />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
