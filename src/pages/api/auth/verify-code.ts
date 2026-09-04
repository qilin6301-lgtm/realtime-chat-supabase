import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../src/lib/supabaseServerClient';
import crypto from 'crypto';

const HMAC_SECRET = process.env.VERIFICATION_HMAC_SECRET || '';

function hashCode(email: string, code: string) {
  return crypto.createHmac('sha256', HMAC_SECRET).update(`${email}|${code}`).digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, code, password } = req.body;
  if (!email || !code || !password) return res.status(400).json({ error: 'missing fields' });

  const codeHash = hashCode(email, code);

  const { data, error } = await supabaseAdmin
    .from('verification_codes')
    .select('*')
    .eq('email', email)
    .eq('code_hash', codeHash)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .single();

  if (error || !data) {
    return res.status(400).json({ error: 'invalid or expired code' });
  }

  try {
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
