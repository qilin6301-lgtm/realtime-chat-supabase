import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../src/lib/supabaseServerClient';

const MAX_ATTEMPTS = 5;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, code, password } = req.body;
  if (!email || !code || !password) return res.status(400).json({ error: 'missing fields' });

  try {
    const { data, error } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .limit(1)
      .single();

    if (error || !data) return res.status(400).json({ error: 'invalid or expired code' });

    // check attempts
    if (data.attempts >= MAX_ATTEMPTS) return res.status(429).json({ error: 'too many attempts' });

    // verify hash
    const hmac = require('crypto').createHmac('sha256', process.env.VERIFICATION_HMAC_SECRET || '').update(`${email}|${code}`).digest('hex');
    if (hmac !== data.code_hash) {
      // increment attempts
      await supabaseAdmin.from('verification_codes').update({ attempts: (data.attempts || 0) + 1 }).eq('id', data.id);
      return res.status(400).json({ error: 'invalid code' });
    }

    // check expiry
    if (new Date(data.expires_at) < new Date()) {
      return res.status(400).json({ error: 'expired' });
    }

    // create user via admin
    const { data: userData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    } as any);

    if (createErr) {
      console.error('create user error', createErr);
      return res.status(500).json({ error: 'create user failed' });
    }

    const userId = (userData as any).id || (userData as any).user?.id;

    // insert profile
    await supabaseAdmin.from('profiles').insert([{ id: userId, username: null }]);

    // cleanup: delete used verification codes
    await supabaseAdmin.from('verification_codes').delete().eq('id', data.id);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('verify error', e);
    return res.status(500).json({ error: 'verification failed' });
  }
}
