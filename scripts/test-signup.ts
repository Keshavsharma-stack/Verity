import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

async function run() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
  );
  
  const testEmail = `test-${Date.now()}@veritycompliance.com`;
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: 'password123',
    options: { data: { company_name: 'Test Corp' } }
  });
  console.log("Session:", !!data.session);
  console.log("User:", data.user?.id);
  console.log("Error:", error);
}
run();
