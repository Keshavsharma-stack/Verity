import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

async function run() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
  );
  
  // Since we are anon, we can't select unless there is a public policy. Let's see.
  const { data, error } = await supabase.from('workspaces').select('id, name');
  console.log("Workspaces:", data, error);
}
run();
