import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../src/lib/supabaseServerClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { room_id, user_id } = req.body;
  if (!room_id || !user_id) return res.status(400).json({ error: 'missing fields' });

  const expiresAt = new Date(Date.now() + 5 * 1000).toISOString(); // 5 seconds

  try {
    await supabaseAdmin.from('typing').upsert([{ room_id, user_id, expires_at: expiresAt }]);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('typing upsert error', e);
    return res.status(500).json({ error: 'typing failed' });
  }
}
