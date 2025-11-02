// Multi-user safe storage layer with Supabase + file fallback
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { supabaseAdmin, isSupabaseConfigured } from './supabase';

// ============================================================================
// INTERFACES
// ============================================================================
export interface PendingTx {
  txId: string;
  account: string;
  unsignedXdr: string;
  recipientAddress?: string;
  amount?: string;
  asset?: string;
  riskScore?: number;
  factors?: Record<string, unknown>;
  expiresAt: number;
  createdAt: number;
  status: 'pending' | 'approved' | 'expired';
}

interface StoredData {
  pending: Record<string, PendingTx>;
  allowlist: Record<string, string[]>;
  totpSecrets: Record<string, string>;
}

// ============================================================================
// FILE STORAGE FALLBACK (legacy, single-user only)
// ============================================================================
const DEFAULT_DB_PATH = './sentinel.db';
const resolvedPath = path.resolve(process.cwd(), DEFAULT_DB_PATH);

function ensureDir() {
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readStore(): StoredData {
  ensureDir();
  if (!fs.existsSync(resolvedPath)) {
    return { pending: {}, allowlist: {}, totpSecrets: {} };
  }
  try {
    const raw = fs.readFileSync(resolvedPath, 'utf-8');
    const parsed = JSON.parse(raw) as StoredData;
    if (!parsed.pending) parsed.pending = {};
    if (!parsed.allowlist) parsed.allowlist = {};
    if (!parsed.totpSecrets) parsed.totpSecrets = {};
    return parsed;
  } catch (error) {
    console.warn('⚠️ Failed to read file storage:', error);
    return { pending: {}, allowlist: {}, totpSecrets: {} };
  }
}

function writeStore(data: StoredData) {
  ensureDir();
  fs.writeFileSync(resolvedPath, JSON.stringify(data, null, 2), 'utf-8');
}

// ============================================================================
// SUPABASE HELPERS
// ============================================================================
async function ensureUserExists(walletAddress: string) {
  if (!supabaseAdmin) return;
  
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .upsert(
        { wallet_address: walletAddress, last_active_at: new Date().toISOString() },
        { onConflict: 'wallet_address' }
      );
    
    if (error) console.error('Error ensuring user exists:', error);
  } catch (err) {
    console.error('Exception ensuring user exists:', err);
  }
}

// ============================================================================
// PENDING TRANSACTIONS
// ============================================================================
export async function createPendingTx(params: {
  account: string;
  unsignedXdr: string;
  ttlSeconds: number;
  recipientAddress?: string;
  amount?: string;
  asset?: string;
  riskScore?: number;
  factors?: Record<string, unknown>;
}): Promise<PendingTx> {
  const txId = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + params.ttlSeconds * 1000;
  
  const entry: PendingTx = {
    txId,
    account: params.account,
    unsignedXdr: params.unsignedXdr,
    recipientAddress: params.recipientAddress,
    amount: params.amount,
    asset: params.asset,
    riskScore: params.riskScore,
    factors: params.factors,
    createdAt: now,
    expiresAt,
    status: 'pending',
  };

  // Use Supabase if configured
  if (isSupabaseConfigured() && supabaseAdmin) {
    try {
      await ensureUserExists(params.account);
      
      const { error } = await supabaseAdmin
        .from('pending_transactions')
        .insert({
          tx_id: txId,
          wallet_address: params.account,
          unsigned_xdr: params.unsignedXdr,
          recipient_address: params.recipientAddress || '',
          amount: params.amount || '0',
          asset: params.asset || 'XLM',
          risk_score: params.riskScore || 0,
          factors: params.factors || {},
          status: 'pending',
          created_at: new Date(now).toISOString(),
          expires_at: new Date(expiresAt).toISOString(),
        });
      
      if (error) {
        console.error('❌ Supabase insert failed:', error);
        throw error;
      }
      
      console.log('✅ Created pending tx in Supabase:', txId);
      return entry;
    } catch (err) {
      console.error('❌ Supabase error, falling back to file:', err);
      // Fall through to file storage
    }
  }

  // File storage fallback
  const store = readStore();
  store.pending[txId] = entry;
  writeStore(store);
  console.log('⚠️ Created pending tx in file storage:', txId);
  return entry;
}

export async function getPendingTx(txId: string): Promise<PendingTx | null> {
  // Try Supabase first
  if (isSupabaseConfigured() && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('pending_transactions')
        .select('*')
        .eq('tx_id', txId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Supabase query error:', error);
      }
      
      if (data) {
        const now = Date.now();
        const expiresAt = new Date(data.expires_at).getTime();
        
        // Auto-expire if needed
        if (expiresAt < now && data.status === 'pending') {
          await supabaseAdmin
            .from('pending_transactions')
            .update({ status: 'expired' })
            .eq('tx_id', txId);
          
          return {
            txId: data.tx_id,
            account: data.wallet_address,
            unsignedXdr: data.unsigned_xdr,
            recipientAddress: data.recipient_address,
            amount: data.amount,
            asset: data.asset,
            riskScore: data.risk_score,
            factors: data.factors,
            createdAt: new Date(data.created_at).getTime(),
            expiresAt,
            status: 'expired',
          };
        }
        
        return {
          txId: data.tx_id,
          account: data.wallet_address,
          unsignedXdr: data.unsigned_xdr,
          recipientAddress: data.recipient_address,
          amount: data.amount,
          asset: data.asset,
          riskScore: data.risk_score,
          factors: data.factors,
          createdAt: new Date(data.created_at).getTime(),
          expiresAt,
          status: data.status,
        };
      }
    } catch (err) {
      console.error('Supabase getPendingTx error:', err);
    }
  }

  // File storage fallback
  const store = readStore();
  const entry = store.pending[txId];
  if (!entry) return null;
  
  if (entry.expiresAt < Date.now() && entry.status === 'pending') {
    entry.status = 'expired';
    store.pending[txId] = entry;
    writeStore(store);
  }
  
  return entry;
}

export async function markPendingTxApproved(txId: string): Promise<PendingTx | null> {
  // Try Supabase first
  if (isSupabaseConfigured() && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('pending_transactions')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('tx_id', txId)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase update error:', error);
      } else if (data) {
        return {
          txId: data.tx_id,
          account: data.wallet_address,
          unsignedXdr: data.unsigned_xdr,
          recipientAddress: data.recipient_address,
          amount: data.amount,
          asset: data.asset,
          riskScore: data.risk_score,
          factors: data.factors,
          createdAt: new Date(data.created_at).getTime(),
          expiresAt: new Date(data.expires_at).getTime(),
          status: 'approved',
        };
      }
    } catch (err) {
      console.error('Supabase markApproved error:', err);
    }
  }

  // File storage fallback
  const store = readStore();
  const entry = store.pending[txId];
  if (!entry) return null;
  
  entry.status = 'approved';
  store.pending[txId] = entry;
  writeStore(store);
  return entry;
}

export async function deletePendingTx(txId: string): Promise<void> {
  // Try Supabase first
  if (isSupabaseConfigured() && supabaseAdmin) {
    try {
      await supabaseAdmin
        .from('pending_transactions')
        .delete()
        .eq('tx_id', txId);
    } catch (err) {
      console.error('Supabase delete error:', err);
    }
  }

  // File storage fallback
  const store = readStore();
  if (store.pending[txId]) {
    delete store.pending[txId];
    writeStore(store);
  }
}

// ============================================================================
// ALLOWLIST
// ============================================================================
export async function addAllowlistedRecipient(
  account: string, 
  recipient: string,
  addedVia?: string
): Promise<void> {
  // Try Supabase first
  if (isSupabaseConfigured() && supabaseAdmin) {
    try {
      await ensureUserExists(account);
      
      const { error } = await supabaseAdmin
        .from('allowlist')
        .upsert(
          {
            wallet_address: account,
            recipient_address: recipient,
            added_via: addedVia || 'manual',
          },
          { onConflict: 'wallet_address,recipient_address' }
        );
      
      if (error) {
        console.error('Supabase allowlist insert error:', error);
      } else {
        console.log('✅ Added to allowlist in Supabase');
        return;
      }
    } catch (err) {
      console.error('Supabase allowlist error:', err);
    }
  }

  // File storage fallback
  const store = readStore();
  const list = store.allowlist[account] || [];
  if (!list.includes(recipient)) {
    list.push(recipient);
    store.allowlist[account] = list;
    writeStore(store);
  }
}

export async function getAllowlistedRecipients(account: string): Promise<string[]> {
  // Try Supabase first
  if (isSupabaseConfigured() && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('allowlist')
        .select('recipient_address')
        .eq('wallet_address', account);
      
      if (error) {
        console.error('Supabase allowlist query error:', error);
      } else if (data) {
        return data.map(row => row.recipient_address);
      }
    } catch (err) {
      console.error('Supabase getAllowlist error:', err);
    }
  }

  // File storage fallback
  const store = readStore();
  return store.allowlist[account] || [];
}

// ============================================================================
// TOTP SECRETS
// ============================================================================
export async function saveTotpSecret(account: string, secret: string): Promise<void> {
  // Try Supabase first
  if (isSupabaseConfigured() && supabaseAdmin) {
    try {
      await ensureUserExists(account);
      
      if (secret) {
        const { error } = await supabaseAdmin
          .from('totp_secrets')
          .upsert(
            {
              wallet_address: account,
              encrypted_secret: secret, // TODO: Add actual encryption
              enabled: true,
            },
            { onConflict: 'wallet_address' }
          );
        
        if (error) {
          console.error('Supabase TOTP save error:', error);
        } else {
          console.log('✅ Saved TOTP secret in Supabase');
          return;
        }
      } else {
        await supabaseAdmin
          .from('totp_secrets')
          .delete()
          .eq('wallet_address', account);
        return;
      }
    } catch (err) {
      console.error('Supabase TOTP error:', err);
    }
  }

  // File storage fallback
  const store = readStore();
  if (secret) {
    store.totpSecrets[account] = secret;
  } else {
    delete store.totpSecrets[account];
  }
  writeStore(store);
}

export async function getTotpSecret(account: string): Promise<string | null> {
  // Try Supabase first
  if (isSupabaseConfigured() && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('totp_secrets')
        .select('encrypted_secret, enabled')
        .eq('wallet_address', account)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Supabase TOTP query error:', error);
      }
      
      if (data && data.enabled) {
        // Update last_used_at
        await supabaseAdmin
          .from('totp_secrets')
          .update({ last_used_at: new Date().toISOString() })
          .eq('wallet_address', account);
        
        return data.encrypted_secret; // TODO: Add actual decryption
      }
    } catch (err) {
      console.error('Supabase getTotpSecret error:', err);
    }
  }

  // File storage fallback
  const store = readStore();
  return store.totpSecrets[account] || null;
}

