-- Sentinel AI Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Stores user profiles linked to Stellar wallet addresses
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  telegram_chat_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_telegram ON users(telegram_chat_id);

-- ============================================================================
-- PENDING_TRANSACTIONS TABLE
-- ============================================================================
-- Stores high-risk transactions awaiting guardian approval
CREATE TABLE pending_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_id TEXT UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  unsigned_xdr TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  asset TEXT NOT NULL,
  risk_score DECIMAL(3,2) NOT NULL,
  factors JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT
);

CREATE INDEX idx_pending_tx_wallet ON pending_transactions(wallet_address);
CREATE INDEX idx_pending_tx_status ON pending_transactions(status);
CREATE INDEX idx_pending_tx_expires ON pending_transactions(expires_at);
CREATE INDEX idx_pending_tx_created ON pending_transactions(created_at DESC);

-- ============================================================================
-- ALLOWLIST TABLE
-- ============================================================================
-- Stores trusted recipient addresses per user
CREATE TABLE allowlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  recipient_address TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_via TEXT, -- 'manual', 'telegram', 'confirmation'
  notes TEXT,
  UNIQUE(wallet_address, recipient_address)
);

CREATE INDEX idx_allowlist_wallet ON allowlist(wallet_address);
CREATE INDEX idx_allowlist_recipient ON allowlist(recipient_address);

-- ============================================================================
-- TOTP_SECRETS TABLE
-- ============================================================================
-- Stores encrypted TOTP secrets for Google Authenticator
CREATE TABLE totp_secrets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  encrypted_secret TEXT NOT NULL, -- Store encrypted, never plain text
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_totp_wallet ON totp_secrets(wallet_address);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
-- Complete transaction history with risk analysis results
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  tx_hash TEXT UNIQUE NOT NULL,
  recipient_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  asset TEXT NOT NULL,
  risk_score DECIMAL(3,2) NOT NULL,
  risk_bucket TEXT NOT NULL CHECK (risk_bucket IN ('low', 'medium', 'high')),
  factors JSONB DEFAULT '{}',
  verification_method TEXT, -- 'none', 'totp', 'guardian'
  confirmed_legitimate BOOLEAN, -- User confirmation post-transaction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_wallet ON transactions(wallet_address);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_transactions_risk ON transactions(risk_bucket);
CREATE INDEX idx_transactions_hash ON transactions(tx_hash);

-- ============================================================================
-- WALLET_STATS TABLE
-- ============================================================================
-- Behavioral statistics for risk analysis
CREATE TABLE wallet_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  avg_amount DECIMAL(20,7) DEFAULT 0,
  std_amount DECIMAL(20,7) DEFAULT 0,
  p95_amount DECIMAL(20,7) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  hour_histogram JSONB DEFAULT '{}', -- {0: count, 1: count, ..., 23: count}
  asset_distribution JSONB DEFAULT '{}', -- {XLM: 0.5, USDC: 0.5}
  top_recipients JSONB DEFAULT '[]', -- [{address, count, total_amount}]
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wallet_stats_wallet ON wallet_stats(wallet_address);

-- ============================================================================
-- ACCOUNT_LOCKS TABLE
-- ============================================================================
-- Temporary account locks for security
CREATE TABLE account_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  reason TEXT NOT NULL, -- 'user_denied', 'suspicious_activity', 'telegram_lock'
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  locked_by TEXT -- 'user', 'system', 'telegram'
);

CREATE INDEX idx_account_locks_wallet ON account_locks(wallet_address);
CREATE INDEX idx_account_locks_expires ON account_locks(expires_at);

-- ============================================================================
-- RISK_EVENTS TABLE
-- ============================================================================
-- Log of all risk analysis events for auditing
CREATE TABLE risk_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'risk_analysis', 'step_up', 'guardian_approval', etc.
  risk_score DECIMAL(3,2),
  factors JSONB DEFAULT '{}',
  action_taken TEXT, -- 'allowed', 'step_up_required', 'guardian_required', 'blocked'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_risk_events_wallet ON risk_events(wallet_address);
CREATE INDEX idx_risk_events_created ON risk_events(created_at DESC);
CREATE INDEX idx_risk_events_type ON risk_events(event_type);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_stats_updated_at BEFORE UPDATE ON wallet_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user if not exists
CREATE OR REPLACE FUNCTION ensure_user_exists(p_wallet_address TEXT)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  INSERT INTO users (wallet_address)
  VALUES (p_wallet_address)
  ON CONFLICT (wallet_address) DO UPDATE
  SET last_active_at = NOW()
  RETURNING id INTO v_user_id;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(p_wallet_address TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM account_locks
    WHERE wallet_address = p_wallet_address
    AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired transactions
CREATE OR REPLACE FUNCTION cleanup_expired_transactions()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  UPDATE pending_transactions
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on all tables for security

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE totp_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_events ENABLE ROW LEVEL SECURITY;

-- Policies: Allow service role full access (for backend)
-- In production, you'd create more granular policies

CREATE POLICY "Allow service role full access" ON users
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access" ON pending_transactions
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access" ON allowlist
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access" ON totp_secrets
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access" ON transactions
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access" ON wallet_stats
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access" ON account_locks
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access" ON risk_events
  FOR ALL USING (true);

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Get user's pending transactions
-- SELECT * FROM pending_transactions 
-- WHERE wallet_address = 'GDSR...' AND status = 'pending';

-- Get user's allowlist
-- SELECT recipient_address FROM allowlist WHERE wallet_address = 'GDSR...';

-- Get user's risk history
-- SELECT * FROM risk_events 
-- WHERE wallet_address = 'GDSR...' 
-- ORDER BY created_at DESC LIMIT 50;

-- Check if account is locked
-- SELECT is_account_locked('GDSR...');

-- Get transaction statistics
-- SELECT * FROM wallet_stats WHERE wallet_address = 'GDSR...';

-- Clean up expired transactions (run periodically)
-- SELECT cleanup_expired_transactions();
