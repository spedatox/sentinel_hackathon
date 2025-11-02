// Supabase Client Configuration
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Environment variables - add these to your .env.local:
// NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
// NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
// SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (for backend only)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasPublicConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasPublicConfig) {
  console.warn('Supabase not configured. Using fallback file storage.');
}

let supabase: SupabaseClient | null = null;
let supabaseAdmin: SupabaseClient | null = null;

if (hasPublicConfig) {
  supabase = createClient(supabaseUrl!, supabaseAnonKey!);

  if (supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey);
  }
}

// Public client for frontend (respects RLS)
export { supabase, supabaseAdmin };

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return hasPublicConfig;
}

// Database types for TypeScript
export interface DbUser {
  id: string;
  wallet_address: string;
  telegram_chat_id?: string;
  created_at: string;
  updated_at: string;
  last_active_at: string;
}

export interface DbPendingTransaction {
  id: string;
  tx_id: string;
  wallet_address: string;
  unsigned_xdr: string;
  recipient_address: string;
  amount: string;
  asset: string;
  risk_score: number;
  factors: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  created_at: string;
  expires_at: string;
  approved_at?: string;
  approved_by?: string;
}

export interface DbAllowlist {
  id: string;
  wallet_address: string;
  recipient_address: string;
  added_at: string;
  added_via?: string;
  notes?: string;
}

export interface DbTotpSecret {
  id: string;
  wallet_address: string;
  encrypted_secret: string;
  enabled: boolean;
  created_at: string;
  last_used_at?: string;
}

export interface DbTransaction {
  id: string;
  wallet_address: string;
  tx_hash: string;
  recipient_address: string;
  amount: string;
  asset: string;
  risk_score: number;
  risk_bucket: 'low' | 'medium' | 'high';
  factors: Record<string, any>;
  verification_method?: string;
  confirmed_legitimate?: boolean;
  created_at: string;
}

export interface DbWalletStats {
  id: string;
  wallet_address: string;
  avg_amount: number;
  std_amount: number;
  p95_amount: number;
  transaction_count: number;
  hour_histogram: Record<string, number>;
  asset_distribution: Record<string, number>;
  top_recipients: Array<{
    address: string;
    count: number;
    total_amount: number;
  }>;
  last_calculated_at: string;
  updated_at: string;
}

export interface DbAccountLock {
  id: string;
  wallet_address: string;
  reason: string;
  locked_at: string;
  expires_at: string;
  locked_by: string;
}

export interface DbRiskEvent {
  id: string;
  wallet_address: string;
  event_type: string;
  risk_score?: number;
  factors: Record<string, any>;
  action_taken: string;
  metadata: Record<string, any>;
  created_at: string;
}

