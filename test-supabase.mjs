// Test Supabase Connection
// Run with: node --loader tsx test-supabase.mjs

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase Connection...\n');

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Environment variables not set:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');
  console.log('\n📝 Add these to .env.local (see .env.example)');
  process.exit(1);
}

console.log('✅ Environment variables found');
console.log('   URL:', supabaseUrl);
console.log('   Key:', supabaseKey.substring(0, 20) + '...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test 1: Check if we can connect
    console.log('🧪 Test 1: Database Connection');
    const { data: tables, error: tablesError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (tablesError) {
      if (tablesError.message.includes('relation "users" does not exist')) {
        console.log('❌ Tables not created yet');
        console.log('   Run supabase-schema.sql in Supabase SQL Editor\n');
        return false;
      }
      throw tablesError;
    }
    
    console.log('✅ Connected to database\n');

    // Test 2: Create a test user
    console.log('🧪 Test 2: Create Test User');
    const testWallet = 'GDSR...' + Date.now();
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({ wallet_address: testWallet })
      .select()
      .single();
    
    if (userError) throw userError;
    console.log('✅ Created user:', user.wallet_address, '\n');

    // Test 3: Create a pending transaction
    console.log('🧪 Test 3: Create Pending Transaction');
    const { data: tx, error: txError } = await supabase
      .from('pending_transactions')
      .insert({
        tx_id: crypto.randomUUID(),
        wallet_address: testWallet,
        unsigned_xdr: 'test_xdr_' + Date.now(),
        recipient_address: 'GCSR...',
        amount: '100',
        asset: 'XLM',
        risk_score: 0.75,
        factors: { newRecipient: true, unusualAmount: true },
        status: 'pending',
        expires_at: new Date(Date.now() + 300000).toISOString(),
      })
      .select()
      .single();
    
    if (txError) throw txError;
    console.log('✅ Created transaction:', tx.tx_id, '\n');

    // Test 4: Query the transaction
    console.log('🧪 Test 4: Query Transaction');
    const { data: queriedTx, error: queryError } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('tx_id', tx.tx_id)
      .single();
    
    if (queryError) throw queryError;
    console.log('✅ Queried transaction:', queriedTx.tx_id);
    console.log('   Status:', queriedTx.status);
    console.log('   Risk Score:', queriedTx.risk_score, '\n');

    // Test 5: Add to allowlist
    console.log('🧪 Test 5: Add to Allowlist');
    const { error: allowlistError } = await supabase
      .from('allowlist')
      .insert({
        wallet_address: testWallet,
        recipient_address: 'GCSR...',
        added_via: 'test',
      });
    
    if (allowlistError) throw allowlistError;
    console.log('✅ Added to allowlist\n');

    // Test 6: Save TOTP secret
    console.log('🧪 Test 6: Save TOTP Secret');
    const { error: totpError } = await supabase
      .from('totp_secrets')
      .insert({
        wallet_address: testWallet,
        encrypted_secret: 'test_secret_' + Date.now(),
        enabled: true,
      });
    
    if (totpError) throw totpError;
    console.log('✅ Saved TOTP secret\n');

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await supabase.from('users').delete().eq('wallet_address', testWallet);
    console.log('✅ Cleanup complete\n');

    console.log('🎉 All tests passed!');
    console.log('✅ Supabase is configured correctly');
    console.log('✅ Your Sentinel app is ready for multi-user production!\n');
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('1. Check if supabase-schema.sql was run in SQL Editor');
    console.error('2. Verify SUPABASE_SERVICE_ROLE_KEY (not anon key)');
    console.error('3. Check Supabase project is active (not paused)\n');
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
