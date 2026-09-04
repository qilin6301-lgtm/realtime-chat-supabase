import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../src/lib/supabaseClient';
import { useAuth } from '../../../src/lib/useAuth';

export default function RoomPage({ params }: any) {
  const { id } = params;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [online, setOnline] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const pageSize = 30; // configurable
  const earliestRef = useRef<Date | null>(null);
  const { user } = useAuth();
  const presenceIntervalRef = useRef<any>(null);
  const typingIntervalRef = useRef<any>(null);

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

    // presence subscription
    const presenceChannel = supabase
      .channel('public:presence')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presence', filter: `room_id=eq.${id}` }, payload => {
        // fetch current presence list after change
        fetchPresence();
      })
      .subscribe();

    // typing subscription
    const typingChannel = supabase
      .channel('public:typing')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'typing', filter: `room_id=eq.${id}` }, payload => {
        fetchTyping();
      })
      .subscribe();

    // start heartbeat to upsert presence every 30s
    async function startPresence() {
      if (!user) return;
      await upsertPresence();
      presenceIntervalRef.current = setInterval(() => { upsertPresence(); }, 30000);
      // initial fetch
      fetchPresence();
    }

    startPresence();

    // poll typing to remove expired entries
    typingIntervalRef.current = setInterval(() => fetchTyping(), 2000);

    return () => {
      mounted = false;
      channel.unsubscribe();
      presenceChannel.unsubscribe();
      typingChannel.unsubscribe();
      if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, [id, user]);

  async function fetchPresence() {
    const { data } = await supabase.from('presence').select('*').eq('room_id', id);
    const userIds = (data || []).map((p: any) => p.user_id);
    if (userIds.length === 0) { setOnline([]); return; }
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
    setOnline(profiles || []);
  }

  async function fetchTyping() {
    const now = new Date().toISOString();
    const { data } = await supabase.from('typing').select('*').eq('room_id', id).gt('expires_at', now);
    const userIds = (data || []).map((p: any) => p.user_id);
    if (userIds.length === 0) { setTypingUsers([]); return; }
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
    setTypingUsers(profiles || []);
  }

  async function upsertPresence() {
    if (!user) return;
    await supabase.from('presence').upsert([{ room_id: id, user_id: user.id, last_seen: new Date().toISOString() }]);
  }

  async function send() {
    if (!text || !user) return;
    try {
      const client_msg_id = cryptoRandomUUID();
      const res = await fetch('/api/messages/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_id: id, user_id: user.id, client_msg_id, content: text }) });
      const j = await res.json();
      if (!res.ok) console.error('send failed', j);
      setText('');
    } catch (e) {
      console.error(e);
    }
  }

  function startTyping() {
    if (!user) return;
    // notify typing endpoint
    fetch('/api/typing/upsert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_id: id, user_id: user.id }) });
  }

  function cryptoRandomUUID() {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) return (crypto as any).randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Room {id}</h2>
      <div>
        在线：{online.map(u => <span key={u.id} style={{marginRight:8}}>{u.username || u.id}</span>)}
      </div>
      <div>
        打字中：{typingUsers.map(u => <span key={u.id} style={{marginRight:8}}>{u.username || u.id}</span>)}
      </div>
      <div>
        {hasMore && <button onClick={loadOlder}>加载更早消息</button>}
      </div>
      <div style={{ height: 400, overflow: 'auto', border: '1px solid #ddd', padding: 8 }}>
        {messages.map(m => (
          <div key={m.id}><strong>{m.author}</strong>: {m.content}</div>
        ))}
      </div>
      <div>
        <input value={text} onChange={e => { setText(e.target.value); startTyping(); }} />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
