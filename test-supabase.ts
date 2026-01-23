import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseAnonKey);
    return;
  }

  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Anon Key present:', !!supabaseAnonKey);

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Test basic connection by fetching session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
    } else {
      console.log('Session retrieved successfully:', !!session);
    }

    // Test authentication endpoint directly
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
    });

    console.log('Direct API response status:', response.status);
    console.log('Direct API response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Direct API error:', errorText);
    } else {
      const userData = await response.json();
      console.log('Direct API user data:', userData);
    }
  } catch (error) {
    console.error('Connection test error:', error);
  }
}

testSupabaseConnection().catch(console.error);