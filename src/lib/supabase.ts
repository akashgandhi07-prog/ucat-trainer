import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// --- DEBUGGING BLOCK ---
console.log("--------------------------------");
console.log("DEBUG: Supabase Connection Check");
console.log("URL Exists?", !!supabaseUrl);
console.log("Key Exists?", !!supabaseKey);
console.log("--------------------------------");
// -----------------------

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or Key. Check Vercel Environment Variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);