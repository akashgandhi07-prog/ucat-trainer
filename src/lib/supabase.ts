import { createClient } from '@supabase/supabase-js';

// Client uses only the anon key; service role key must never be referenced in client code.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or Key. Check Vercel Environment Variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);