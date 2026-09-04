import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { supabaseAdmin } from '../../../src/lib/supabaseServerClient';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'no-reply@yourdomain.com';
const HMAC_SECRET = process.env.VERIFICATION_HMAC_SECRET || '';

function makeCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashCode(email: string, code: string) {
  return crypto.createHmac('sha256', HMAC_SECRET).update(`${email}|${code}`).digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const code = makeCode();
  const codeHash = hashCode(email, code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  // Upsert the verification code
  const { error } = await supabaseAdmin
    .from('verification_codes')
    .insert([{ email, code_hash: codeHash, expires_at: expiresAt }]);

  if (error) {
    console.error('insert verification error', error);
    return res.status(500).json({ error: 'db error' });
  }

  // send email via Resend
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: '你的验证代码',
      html: `<p>你的验证码是 <strong>${code}</strong></p><p>有效期 10 分钟</p>`
    });
  } catch (e) {
    console.error('resend error', e);
    return res.status(500).json({ error: 'email send failed' });
  }

  return res.status(200).json({ ok: true });
}
