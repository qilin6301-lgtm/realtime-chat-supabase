import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!serviceRole) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required on server');

export const supabaseAdmin = createClient(supabaseUrl, serviceRole);
