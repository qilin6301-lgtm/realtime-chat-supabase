import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../src/lib/supabaseServerClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { room_id, user_id, client_msg_id, content } = req.body;
  if (!room_id || !user_id || !client_msg_id || !content) return res.status(400).json({ error: 'missing fields' });

  try {
    // try insert
    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert([{ room_id, author: user_id, content, client_msg_id }])
      .select()
      .limit(1);

    if (error) {
      // if unique constraint error on client_msg_id, fetch existing message
      // Postgres unique violation has code '23505'
      // supabase-js surfaces error.message; do a fallback select
      const existing = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('room_id', room_id)
        .eq('client_msg_id', client_msg_id)
        .limit(1)
        .single();
      if (existing.error) {
        console.error('insert message error and fetch failed', error, existing.error);
        return res.status(500).json({ error: 'insert failed' });
      }
      return res.status(200).json({ data: existing.data, ok: true });
    }

    return res.status(200).json({ data: data?.[0] ?? null, ok: true });
  } catch (e) {
    console.error('server send error', e);
    return res.status(500).json({ error: 'server error' });
  }
}
