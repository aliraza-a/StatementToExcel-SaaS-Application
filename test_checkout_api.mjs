import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testCheckout() {
  const email = `test_checkout_${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  let userId = null;

  try {
    const { data: userData, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (createErr) throw createErr;
    userId = userData.user.id;
    console.log(`✅ User created: ${userId}`);

    const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) throw signInErr;
    const accessToken = authData.session.access_token;
    const refreshToken = authData.session.refresh_token;

    const cookieString = `sb-pojyxtggzgpnfdtykvij-auth-token=${encodeURIComponent(JSON.stringify({access_token: accessToken, refresh_token: refreshToken}))}`;

    console.log('Hitting /api/checkout ...');
    const res = await fetch('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: {
        'Cookie': cookieString,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ planId: 'onetime' })
    });

    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${text}`);

  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    if (userId) {
      await adminClient.auth.admin.deleteUser(userId);
    }
  }
}

testCheckout();
