# 🧠 Sentinel AI Transaction Security System

**Complete Architecture & Implementation Guide**

---

## 📋 Overview

Sentinel is an AI-powered transaction security layer for Stellar wallets that:
- **Analyzes** every transaction in real-time using behavioral patterns
- **Verifies** risky transactions with Google Authenticator (TOTP)
- **Alerts** users via Telegram before and after suspicious activity
- **Learns** from user confirmations to reduce false positives over time
- **Enforces** security policies through smart contracts (optional)

---

## 🎯 Current Implementation Status

### ✅ **Completed Features**

#### 1. Risk Analysis Engine
- **Location:** `src/lib/risk.ts`, `src/lib/horizon.ts`
- **Features:**
  - Z-score analysis on transaction amounts
  - New recipient detection
  - Off-hours pattern recognition
  - Frequency spike detection (drip attacks)
  - Recipient concentration analysis
  - Asset mix drift detection
- **API:** `POST /api/risk/score` → returns `{score, bucket, factors, reasons}`

#### 2. AI Explanation Layer
- **Location:** `src/lib/ai.ts`, `src/lib/explain.ts`
- **Features:**
  - OpenAI GPT integration for natural language explanations
  - Fallback to deterministic templates
  - Context-aware risk narratives
- **API:** `POST /api/risk/explain` → returns `{text, source}`
- **Environment:** `OPENAI_API_KEY`, `OPENAI_MODEL`

#### 3. Google Authenticator (TOTP)
- **Location:** `src/lib/totp.ts`, `src/components/TotpSetup.tsx`
- **Features:**
  - QR code generation for easy setup
  - 6-digit code verification (30s window)
  - Per-account secret storage
  - Integration with step-up modal
- **APIs:**
  - `POST /api/auth/totp/setup` → generates secret + QR
  - `POST /api/auth/totp/verify` → validates code
  - `POST /api/auth/totp/status` → check/disable TOTP
- **Storage:** Secrets stored in `sentinel.db` (JSON file)

#### 4. Step-Up Authentication
- **Location:** `src/components/StepUpModal.tsx`
- **Features:**
  - Cooldown timer (30s medium, 60s high risk)
  - Auto-detects if TOTP is enabled
  - Falls back to demo code `123123` if TOTP not configured
  - Visual risk score display
- **Triggers:**
  - Medium risk (0.3 ≤ score < 0.6)
  - High risk (score ≥ 0.6)

#### 5. Guardian Approval System
- **Location:** `src/lib/guardian.ts`, `src/app/api/guardian/*`
- **Features:**
  - Unsigned XDR creation for high-risk transactions
  - Queue management in storage
  - Optional external signer integration
  - Telegram notification hooks
- **APIs:**
  - `POST /api/guardian/prepare` → creates pending transaction
  - `POST /api/guardian/approve` → cosigns and submits

#### 6. Telegram Integration (Stub)
- **Location:** `src/lib/telegram.ts`, `src/app/api/telegram/webhook`
- **Features:**
  - Bot notification sending
  - Inline button handling (DETAILS, PROBE, LOCK1H, APPROVE, MARKSAFE)
  - Webhook endpoint for callbacks
- **Environment:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_URL`
- **Status:** Stub implementation ready for bot token

#### 7. Smart Contracts (Soroban)
- **Location:** `contracts/`
- **Contracts:**
  - **Policy** (`contracts/policy/`) - spending limits, allowlists
  - **Guardian** (`contracts/guardian/`) - multi-sig approvals
  - **Gatekeeper** (`contracts/gatekeeper/`) - risk-based gating
- **Integration:** `src/lib/contracts.ts` (stub implementations)
- **Status:** Contracts written, need deployment + full RPC integration

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER (Freighter)                    │
└───────────────┬─────────────────────────────────────────────┘
                │
                │ 1. Initiate Payment
                ▼
┌───────────────────────────────────────────────────────────┐
│                    PAYMENT FORM                           │
│  • Captures recipient, amount, memo                       │
│  • Fetches Horizon history                                │
└───────────────┬───────────────────────────────────────────┘
                │
                │ 2. Calculate Risk Score
                ▼
┌───────────────────────────────────────────────────────────┐
│                   RISK ENGINE (/api/risk/score)           │
│  • Z-score analysis                                       │
│  • New recipient check                                    │
│  • Off-hours detection                                    │
│  • Frequency spike                                        │
│  • Returns: {score, bucket, factors}                      │
└───────────────┬───────────────────────────────────────────┘
                │
                │ 3. Get Explanation
                ▼
┌───────────────────────────────────────────────────────────┐
│              AI EXPLANATION (/api/risk/explain)           │
│  • OpenAI function-calling (if API key set)               │
│  • Fallback to deterministic templates                    │
│  • Returns: {text, source: "ai" | "rules"}                │
└───────────────┬───────────────────────────────────────────┘
                │
                ├─ Low Risk (< 0.3) ──────────────────────┐
                │                                          │
                ├─ Medium Risk (0.3 - 0.6) ───────────┐   │
                │                                      │   │
                └─ High Risk (≥ 0.6) ─────────────┐   │   │
                                                  │   │   │
        ┌─────────────────────────────────────────┼───┼───┘
        │                                         │   │
        │ 4. Require Step-Up                     │   │
        ▼                                         │   │
┌───────────────────────────────────────────────┐│   │
│           STEP-UP MODAL                       ││   │
│  • Check if TOTP enabled                      ││   │
│  • Show cooldown timer                        ││   │
│  • If TOTP: verify via /api/auth/totp/verify  ││   │
│  • If not: use demo code 123123               ││   │
└───────────────┬───────────────────────────────┘│   │
                │                                 │   │
                │ 5a. TOTP Verified              │   │
                │                                 │   │
                └─────────────┬──────────────────┘   │
                              │                       │
                              │ 5b. Direct Submit     │
                              │                       │
        ┌─────────────────────┼───────────────────────┘
        │                     │
        │ 6. High Risk Path   │ 6. Low/Medium Path
        ▼                     ▼
┌─────────────────────┐  ┌──────────────────────┐
│ GUARDIAN PREPARE    │  │  STELLAR SUBMIT      │
│ • Create unsigned   │  │  • Sign with wallet  │
│ • Queue in storage  │  │  • Submit to Horizon │
│ • Notify Telegram   │  │                      │
└─────────┬───────────┘  └──────────┬───────────┘
          │                         │
          │ 7. Guardian Approve     │
          ▼                         │
┌─────────────────────┐            │
│ TELEGRAM BOT        │            │
│ • Send alert        │            │
│ • Inline buttons    │            │
│ • Callback handler  │            │
└─────────┬───────────┘            │
          │                         │
          │ 8. Approved             │
          ▼                         │
┌─────────────────────┐            │
│ GUARDIAN APPROVE    │            │
│ • Fetch pending XDR │            │
│ • Cosign & submit   │            │
└─────────┬───────────┘            │
          │                         │
          └─────────────┬───────────┘
                        │
                        │ 9. Post-Transaction
                        ▼
          ┌──────────────────────────┐
          │   TELEGRAM CONFIRMATION  │
          │  "Was this you?"         │
          │  [Yes] → Learn behavior  │
          │  [No] → Lock account 24h │
          └──────────────────────────┘
```

---

## 🔐 Security Layers Explained

### Layer 1: **Behavioral Analysis (Always Active)**
- Runs on every transaction
- Compares against 60 past transactions
- No blocking, just scoring
- **Cost:** Free (Horizon API)

### Layer 2: **Step-Up Verification (Medium Risk)**
- Cooldown timer (30-60 seconds)
- TOTP code if enabled
- Demo code `123123` if not
- **Trigger:** Score 0.3 - 0.6
- **Cost:** Free

### Layer 3: **Guardian Approval (High Risk)**
- Creates unsigned transaction
- Stores in queue
- Sends Telegram alert
- Requires manual approval
- **Trigger:** Score ≥ 0.6
- **Cost:** Free (optional external signer)

### Layer 4: **Post-Transaction Learning**
- Telegram asks "Was this you?"
- User confirms → update allowlist
- User denies → freeze account
- **Purpose:** Reduce false positives
- **Cost:** Free

### Layer 5: **Smart Contracts (Optional)**
- On-chain policy enforcement
- Spending limits enforced by blockchain
- Multi-sig guardian coordination
- **Trigger:** When contracts deployed
- **Cost:** ~50k-100k stroops per check

---

## 🔄 User Flows

### Flow 1: **Low Risk Transaction**
```
User → Enter recipient + amount
     → Risk score: 0.15 (low)
     → Explanation: "Normal transaction pattern"
     → Submit immediately
     → Success ✅
```

### Flow 2: **Medium Risk with TOTP**
```
User → Enter recipient + amount (new address)
     → Risk score: 0.45 (medium)
     → AI Explanation: "New recipient detected"
     → Step-up modal appears
     → Enter Google Authenticator code: 123456
     → Code verified ✅
     → Submit transaction
     → Success ✅
     → Telegram: "Was this you?" → User: "Yes"
     → Add recipient to learned patterns
```

### Flow 3: **High Risk with Guardian**
```
User → Enter large amount at 3 AM
     → Risk score: 0.75 (high)
     → AI Explanation: "4σ above normal, off-hours"
     → Step-up modal appears
     → Enter TOTP code
     → Guardian prepare creates unsigned XDR
     → Telegram alert sent to guardians
     → Guardian clicks "Approve"
     → Transaction cosigned and submitted
     → Success ✅
     → Telegram: "Was this you?" → User: "Yes"
     → Update hour histogram, mark recipient safe
```

### Flow 4: **Fraud Detection**
```
Attacker → Steals wallet, tries large transfer
         → Risk score: 0.85 (high)
         → Step-up modal appears
         → Wrong TOTP code ❌
         → Transaction blocked
         → Telegram alert sent
         → User: "No, this wasn't me"
         → Account locked for 24 hours 🔒
```

---

## 📊 Risk Scoring Explained

### Feature Extraction

For each transaction, we compute:

```typescript
interface Features {
  z_amount: number;              // How many σ above average
  new_recipient: boolean;        // Never sent to this address
  off_hours: boolean;            // Outside active 8-hour window
  freq_spike_ratio: number;      // Today's tx count vs average
  recipient_concentration: number; // % going to top recipient
  asset_mix_l1: number;          // Asset distribution shift
}
```

### Scoring Formula

```typescript
score = 0.25 × min(1, z_amount/3)
      + 0.20 × (new_recipient ? 1 : 0)
      + 0.15 × (off_hours ? 1 : 0)
      + 0.15 × min(1, freq_spike_ratio/5)
      + 0.10 × min(1, asset_mix_l1)
      + 0.15 × min(1, recipient_concentration)
```

### Bucketing

| Score Range | Bucket | Action |
|-------------|--------|--------|
| 0.0 - 0.3   | Low    | Allow immediately |
| 0.3 - 0.6   | Medium | Require step-up (TOTP) |
| 0.6 - 1.0   | High   | Guardian approval + Telegram |

---

## 🤖 AI Integration

### When AI is Used

1. **Risk Explanation** (`/api/risk/explain`)
   - Input: Risk factors + score
   - Output: Human-readable narrative
   - Fallback: Template-based explanation

2. **Future: Decision Enhancement**
   - Input: Full transaction context + history
   - Output: `{ actions: ["require_step_up", "notify_telegram"], explanation: "..." }`
   - Function-calling schema ready

### AI Prompt Structure

```typescript
{
  role: "system",
  content: "You are Sentinel's security analyst. Explain transaction risk clearly."
},
{
  role: "user",
  content: `Risk score: 0.75
Factors: new recipient; amount 4.1σ above normal; sent at 03:00
Recommend next steps.`
}
```

### AI Response Example

```
This transaction raised a red flag due to three unusual patterns:
1. The recipient address is new (never transacted before)
2. The amount (5000 USDC) is 4× your typical spend
3. Sent at 3 AM, outside your normal active hours (9 AM - 5 PM)

Recommendation: Complete Google Authenticator verification. If you 
approve, Sentinel will learn this pattern and reduce future alerts.
```

---

## 📱 Google Authenticator Setup

### User Journey

1. **Connect wallet** → Sentinel loads
2. **See "Enable Google Authenticator" card** in sidebar
3. **Click "Setup Google Authenticator"**
4. **Scan QR code** with Google Authenticator / Authy / Microsoft Authenticator
5. **Enter 6-digit code** to verify setup
6. **Setup complete ✅**

### Technical Flow

```typescript
// 1. Generate secret
POST /api/auth/totp/setup
Body: { account: "GDSR..." }
Response: {
  secret: "JBSWY3DPEHPK3PXP",
  uri: "otpauth://totp/Sentinel:GDSR...?secret=...",
  qrUri: "https://api.qrserver.com/v1/create-qr-code/?data=..."
}

// 2. User scans QR with app

// 3. Verify code
POST /api/auth/totp/verify
Body: { account: "GDSR...", code: "123456" }
Response: { valid: true }

// 4. Future transactions check TOTP automatically
```

### Security Notes

- Secrets stored in `sentinel.db` (file-based storage)
- 30-second window with ±1 period tolerance
- Backup codes not yet implemented (roadmap item)
- Can disable anytime via "Disable" button

---

## 💬 Telegram Integration

### Current Status: **Stub Implementation Ready**

To activate:
1. Create bot via [@BotFather](https://t.me/BotFather)
2. Get bot token
3. Set `TELEGRAM_BOT_TOKEN` in `.env.local`
4. Set `TELEGRAM_WEBHOOK_URL` to your public HTTPS endpoint
5. Register webhook: `POST https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_URL>/api/telegram/webhook`

### Message Types

#### 1. Pre-Transaction Alert (High Risk)
```
⚠️ Sentinel Security Alert

Transaction requires approval:
• To: GBBU98...
• Amount: 5000 USDC
• Time: 03:00 UTC
• Risk: High (score 0.75)

Reasons:
✗ New recipient
✗ 4× your typical amount
✗ Off-hours (outside 09:00-17:00)

Actions:
[ℹ️ Details] [🔍 Probe Transfer] [🔒 Lock 1h] [✅ Approve] [✓ Mark Safe]
```

#### 2. Post-Transaction Confirmation
```
✅ Transaction Completed

Sent 5000 USDC to GBBU98...
Hash: 9a8f7d6e...

Was this transaction legitimate?
[Yes, it was me] [No, freeze my account]
```

### Inline Button Actions

| Button | Action | Description |
|--------|--------|-------------|
| ℹ️ Details | `DETAILS` | Show full transaction context |
| 🔍 Probe | `PROBE` | Send 0.01 XLM test transaction |
| 🔒 Lock 1h | `LOCK1H` | Temporarily disable transactions |
| ✅ Approve | `APPROVE` | Cosign and submit transaction |
| ✓ Mark Safe | `MARKSAFE` | Add recipient to allowlist |
| Yes, it was me | `CONFIRM_YES` | Learn behavior, update stats |
| No, freeze | `CONFIRM_NO` | Lock account for 24 hours |

---

## 🧠 Learning & Adaptation

### What Sentinel Learns

1. **Amount Patterns**
   - Rolling average and standard deviation
   - 95th percentile for outlier detection
   - Updates after each transaction

2. **Time Patterns**
   - 24-hour histogram of active hours
   - Detects user's "normal" window
   - Adapts to schedule changes

3. **Recipient Trust**
   - Builds allowlist of confirmed addresses
   - Reduces false positives over time
   - User can manually manage

4. **Asset Distribution**
   - Tracks typical asset mix (XLM vs USDC vs other)
   - Flags sudden shifts

### Confirmation Flow

```
Transaction → Telegram "Was this you?"
           ↓
        [Yes, it was me]
           ↓
   UPDATE wallet_stats SET
     avg_amount = rolling_avg(past_60),
     hour_hist[3] += 1
   INSERT INTO allowlist
     recipient = "GBBU98..."
           ↓
   Future transactions to GBBU98... → Lower risk score
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Stellar Network
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_NETWORK=testnet
HORIZON_URL=https://horizon-testnet.stellar.org

# Storage
DATABASE_URL=sqlite:./sentinel.db

# AI
OPENAI_API_KEY=sk-...              # Optional: enables AI explanations
OPENAI_MODEL=gpt-4o-mini           # Optional: override model

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC...   # Optional: enables Telegram alerts
TELEGRAM_WEBHOOK_URL=https://...   # Optional: for inline buttons

# Guardian
GUARDIAN_SIGNER_URL=https://...    # Optional: external cosigner

# Smart Contracts (Optional)
NEXT_PUBLIC_POLICY_CONTRACT_ID=CA...
NEXT_PUBLIC_GUARDIAN_CONTRACT_ID=CB...
NEXT_PUBLIC_GATEKEEPER_CONTRACT_ID=CC...
```

### Feature Flags

By default:
- ✅ Risk analysis: **Always on**
- ✅ Deterministic explanations: **Always on**
- ⚠️ AI explanations: **Only if `OPENAI_API_KEY` set**
- ⚠️ TOTP: **User must enable per account**
- ⚠️ Telegram: **Only if `TELEGRAM_BOT_TOKEN` set**
- ⚠️ Contracts: **Only if contract IDs configured**

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd sentinel-app
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env.local
# Add OPENAI_API_KEY (optional)
# Add TELEGRAM_BOT_TOKEN (optional)
```

### 3. Start Dev Server
```bash
npm run dev
```

### 4. Connect Wallet
- Open `http://localhost:3000`
- Click "Connect Wallet"
- Use Freighter on Testnet

### 5. Enable Google Authenticator
- See "Enable Google Authenticator" card
- Click "Setup"
- Scan QR code
- Enter code to verify

### 6. Test Transaction
- Send small amount → Low risk ✅
- Send to new address → Medium risk → Enter TOTP
- Send large amount at odd hour → High risk → Guardian queue

---

## 🧪 Testing Scenarios

### Scenario 1: Normal Transaction
```
Amount: 50 XLM (your average)
Recipient: Known address
Time: 2 PM (your active hours)
Expected: Score ~0.1, Allow immediately
```

### Scenario 2: New Recipient
```
Amount: 50 XLM
Recipient: Never sent before
Expected: Score ~0.35, Require TOTP
```

### Scenario 3: Large Amount
```
Amount: 5000 XLM (100× your average)
Recipient: Known address
Expected: Score ~0.50, Require TOTP + AI explanation
```

### Scenario 4: Suspicious Activity
```
Amount: 5000 XLM
Recipient: New address
Time: 3 AM
Expected: Score ~0.80, Guardian approval + Telegram alert
```

---

## 📦 Next Steps

### Phase 1: Core Functionality ✅
- [x] Risk analysis engine
- [x] TOTP integration
- [x] Step-up modal
- [x] AI explanations
- [x] Guardian queue

### Phase 2: Enhanced Security (In Progress)
- [x] Google Authenticator setup UI
- [x] TOTP verification in step-up
- [ ] Telegram bot activation
- [ ] Post-transaction confirmation
- [ ] Behavior learning loop

### Phase 3: Production Ready
- [ ] Replace file storage with Supabase
- [ ] Implement backup codes for TOTP
- [ ] Add rate limiting
- [ ] Deploy smart contracts
- [ ] Full Soroban RPC integration
- [ ] Guardian dashboard UI
- [ ] Analytics and reporting

### Phase 4: Advanced Features
- [ ] ML-based risk scoring
- [ ] Anomaly detection improvements
- [ ] Multi-account support
- [ ] Mobile app
- [ ] Hardware wallet integration

---

## 🛡️ Security Best Practices

1. **Never log private keys or seeds**
2. **Encrypt TOTP secrets at rest** (future: use Supabase Vault)
3. **Validate all Telegram webhooks** (check signature)
4. **Rate limit API endpoints** (prevent brute force)
5. **Use HTTPS only** (especially for webhooks)
6. **Sanitize all user inputs** (XSS prevention)
7. **Implement CSRF protection** (for state-changing endpoints)
8. **Audit smart contracts** (before mainnet deployment)

---

## 📚 Resources

- [Stellar SDK Documentation](https://stellar.github.io/js-stellar-sdk/)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [TOTP RFC 6238](https://datatracker.ietf.org/doc/html/rfc6238)
- [Soroban Smart Contracts](https://soroban.stellar.org/docs)
- [Sentinel Contracts README](./contracts/README.md)

---

## 🎉 Demo Script

For hackathon presentation:

1. **Connect wallet** → Show balance
2. **Enable Google Authenticator** → Scan QR → Verify
3. **Send normal transaction** → Low risk, immediate approval
4. **Send to new address** → Medium risk, TOTP required
5. **Send large amount at night** → High risk, guardian queue
6. **Show transaction history** → Explain button displays AI reasoning
7. **Optional: Show smart contracts** → Policy limits enforced on-chain

---

**Built for Stellar Soroban Hackathon 2025**
🚀 AI explains. Blockchain enforces. Users stay safe.
