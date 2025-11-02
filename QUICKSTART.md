# ⚡ Quick Start Guide - Sentinel AI

Get Sentinel running in **5 minutes** for your hackathon demo.

---

## 📋 Prerequisites

- **Node.js** 18+ installed
- **Freighter Wallet** browser extension
- **Testnet XLM** (at least 100 XLM for testing)
- **Google Authenticator** app on phone (optional but recommended)

---

## 🚀 Installation (2 minutes)

### 1. Install Dependencies
```bash
cd sentinel-app
npm install
```

### 2. Setup Environment
```bash
# Copy example config
cp .env.example .env.local

# Open .env.local in your editor
# Add your OpenAI API key (optional):
# OPENAI_API_KEY=sk-...
```

### 3. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🎯 First-Time Setup (3 minutes)

### Step 1: Connect Wallet
1. Click **"Connect Wallet"** in the top right
2. Approve connection in Freighter
3. Your balance loads automatically

### Step 2: Enable Google Authenticator (Recommended)
1. Find **"Enable Google Authenticator"** card in sidebar
2. Click **"Setup Google Authenticator"**
3. Open Google Authenticator app on your phone
4. Scan the QR code
5. Enter the 6-digit code to verify
6. See **"TOTP Enabled ✓"** confirmation

### Step 3: Send Your First Transaction
1. Click **"New Payment"** or use payment form
2. Enter recipient address and amount
3. Watch the risk analysis happen in real-time
4. See the risk badge (Low/Medium/High)

---

## 🧪 Test Scenarios

### Scenario 1: Low Risk (No Verification)
```
Amount: 10 XLM
Recipient: An address you've sent to before
Time: Normal hours (9 AM - 5 PM)
Expected: Green badge, immediate approval
```

### Scenario 2: Medium Risk (TOTP Required)
```
Amount: 50 XLM
Recipient: New address (never sent before)
Expected: Yellow badge, step-up modal appears
Action: Enter your 6-digit Google Authenticator code
```

### Scenario 3: High Risk (Guardian Approval)
```
Amount: 500 XLM (much larger than usual)
Recipient: New address
Time: Late night (e.g., 2 AM)
Expected: Red badge, guardian queue
Note: Without Telegram bot, approve manually via API
```

### Scenario 4: Get AI Explanation
```
1. Complete any transaction
2. Go to "Transaction History" section
3. Click "Explain" button on any transaction
4. Read the AI-generated risk narrative
Note: Requires OPENAI_API_KEY in .env.local
```

---

## 🔐 Security Layers Explained

| Risk Level | Score | What Happens | User Action |
|------------|-------|--------------|-------------|
| **Low** | 0.0-0.3 | ✅ Allow immediately | None |
| **Medium** | 0.3-0.6 | ⏱️ 30s cooldown + TOTP | Enter Google Authenticator code |
| **High** | 0.6-1.0 | ⏱️ 60s cooldown + TOTP + Guardian | Enter code, wait for approval |

**Without TOTP Enabled:** Uses demo code `123123` (not secure, for testing only)  
**With TOTP Enabled:** Uses your Google Authenticator codes (secure)

---

## 🎮 Demo Script (3 minutes)

Perfect for hackathon presentations:

### Minute 1: Introduction
> "Sentinel is an AI-powered security layer for Stellar wallets. It analyzes every transaction and stops fraud before it happens."

**Show:** Main UI with connected wallet

### Minute 2: Normal Transaction
> "For normal transactions, Sentinel analyzes the pattern and approves immediately."

**Action:**
1. Send 10 XLM to a known address
2. Show green "Low Risk" badge
3. Transaction goes through instantly

### Minute 3: Suspicious Transaction
> "But when something unusual happens, Sentinel steps in."

**Action:**
1. Send 500 XLM to a new address
2. Show red "High Risk" badge
3. Read the AI explanation
4. Show step-up modal with TOTP requirement
5. If time permits: Show guardian queue

**Closing:**
> "Sentinel combines behavioral analysis, AI explanations, Google Authenticator, and optional Telegram alerts to protect users without friction on normal transactions."

---

## 🐛 Troubleshooting

### "Can't connect wallet"
- Make sure Freighter is installed
- Switch network to **Testnet** in Freighter
- Refresh the page

### "No transactions found"
- You need at least 10 past transactions for accurate analysis
- Use [Stellar Laboratory](https://laboratory.stellar.org/) to seed your account
- Or use our test accounts (ask in Discord)

### "Invalid TOTP code"
- Check your phone's time is set to automatic
- iOS: Settings → General → Date & Time → Set Automatically
- Android: Settings → System → Date & Time → Use network-provided time
- Make sure you're using the latest code (refreshes every 30s)

### "AI explanation not working"
- Check `OPENAI_API_KEY` is set in `.env.local`
- Restart dev server: `npm run dev`
- Check console for API errors
- Without API key, falls back to deterministic templates (still works!)

### "Telegram bot not responding"
- Set `TELEGRAM_BOT_TOKEN` in `.env.local`
- Register webhook (see `.env.example` for command)
- Without Telegram, guardian approvals work via API only

---

## 📚 Next Steps

After getting started:

1. **Read the Complete Guide**: [SENTINEL_COMPLETE_GUIDE.md](./SENTINEL_COMPLETE_GUIDE.md)
2. **Check Implementation Status**: [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)
3. **Setup Telegram Bot**: Follow instructions in `.env.example`
4. **Deploy Smart Contracts**: See `contracts/QUICKSTART.md`
5. **Configure Production DB**: Migrate to Supabase (PostgreSQL)

---

## 🎯 Feature Status

| Feature | Status | Required For Demo |
|---------|--------|-------------------|
| Risk Analysis | ✅ Working | Yes |
| AI Explanations | ✅ Working | Optional |
| Google Authenticator | ✅ Working | Recommended |
| Step-Up Modal | ✅ Working | Yes |
| Guardian Queue | ✅ Working | Yes |
| Telegram Alerts | 🟡 Stub (needs bot token) | Optional |
| Behavior Learning | 🟡 Partial | Optional |
| Smart Contracts | 🟡 Written (needs deployment) | Optional |

---

## ⚙️ Configuration Quick Reference

### Minimal Setup (Just Works)
```bash
# .env.local
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_NETWORK=testnet
HORIZON_URL=https://horizon-testnet.stellar.org
DATABASE_URL=sqlite:./sentinel.db
```

### Recommended Setup (Better Experience)
```bash
# Add AI explanations
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

### Full Setup (All Features)
```bash
# Add Telegram notifications
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_WEBHOOK_URL=https://yourdomain.com

# Add smart contracts (after deployment)
NEXT_PUBLIC_POLICY_CONTRACT_ID=CA...
NEXT_PUBLIC_GUARDIAN_CONTRACT_ID=CB...
NEXT_PUBLIC_GATEKEEPER_CONTRACT_ID=CC...
```

---

## 🏆 Hackathon Tips

1. **Prepare Test Accounts**: Have 2-3 Testnet accounts with transaction history
2. **Pre-Enable TOTP**: Set up Google Authenticator before the demo
3. **Test All Risk Levels**: Low, medium, high transactions
4. **Show AI Explanations**: Click "Explain" button in transaction history
5. **Have Backup Video**: Record a demo in case of technical issues
6. **Know Your Numbers**: "Analyzes 60 transactions", "5 security layers", "30s verification"

---

## 💡 Common Questions

**Q: Do I need to deploy smart contracts?**  
A: No, Sentinel works perfectly without them. Contracts are optional for on-chain enforcement.

**Q: Can I use this without Google Authenticator?**  
A: Yes, it falls back to demo code `123123`, but TOTP is recommended for real security.

**Q: What if I don't have OpenAI API key?**  
A: Sentinel uses deterministic templates instead. Still explains risk clearly.

**Q: How do I test high-risk scenarios?**  
A: Send a large amount (10× your average) to a new address at an unusual time (like 3 AM).

**Q: Where is transaction data stored?**  
A: In `sentinel.db` (SQLite file). For production, migrate to Supabase PostgreSQL.

---

## 🚀 Ready to Demo!

Your Sentinel instance is now running with:
- ✅ Real-time risk analysis
- ✅ Behavioral pattern detection  
- ✅ Google Authenticator 2FA
- ✅ AI-powered explanations (if API key set)
- ✅ Guardian approval queue
- ✅ Step-up authentication

**Demo URL:** http://localhost:3000  
**Duration:** < 5 minutes to show all features  
**Wow Factor:** 🔥🔥🔥

---

**Questions?** Check the [Complete Guide](./SENTINEL_COMPLETE_GUIDE.md) or ask in the hackathon Discord!

**Good luck with your demo! 🎉**
