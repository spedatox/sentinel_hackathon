# ✅ Telegram Integration - Notification System

## What's Been Implemented

### 1. **Telegram Notification Library** (`src/lib/telegram.ts`)
- ✅ `TELEGRAM_CHAT_ID` support for default recipient
- ✅ `isTelegramConfigured()` - Check if bot is ready
- ✅ `notifyTelegramRisk()` - Rich risk notifications with informational buttons
- ✅ `notifyTransactionComplete()` - Post-transaction confirmation
- ✅ Formatted messages with Markdown
- ✅ Multi-row button layouts

### 2. **Guardian API Integration** (`src/app/api/guardian/prepare/route.ts`)
- ✅ Automatic Telegram notification on medium/high-risk transactions
- ✅ Converts risk factors to human-readable descriptions
- ✅ Sends formatted alert with transaction details
- ✅ Includes informational action buttons (Details, Probe, Lock, Mark Safe)

### 3. **Webhook Handler** (`src/app/api/telegram/webhook/route.ts`)
- ✅ `DETAILS` - Shows transaction details
- ✅ `PROBE` - Simulates test transfer
- ✅ `LOCK1H` - Locks account for 1 hour
- ✅ `MARKSAFE` - Adds recipient to allowlist
- ✅ Formatted response messages

**Note:** Transactions are automatically processed by the app after TOTP verification. Telegram serves as a **notification and monitoring tool** - not for approval workflows.

### 4. **Test Endpoint** (`src/app/api/telegram/test/route.ts`)
- ✅ GET endpoint to send test notification
- ✅ Helpful error messages with setup instructions
- ✅ Simulates high-risk transaction alert

### 5. **UI Components**
- ✅ `TelegramStatus` component with test button
- ✅ Integrated into main page sidebar
- ✅ Shows test results inline
- ✅ Links to setup guide

### 6. **Documentation**
- ✅ `TELEGRAM_SETUP_GUIDE.md` - Complete setup walkthrough
- ✅ `TELEGRAM_TESTING.md` - Testing scenarios and troubleshooting
- ✅ Updated `.env.example` with detailed instructions

---

## 🚀 How to Use

### Quick Start (5 Minutes)

1. **Create Bot**
   ```
   1. Open Telegram
   2. Search: @BotFather
   3. Send: /newbot
   4. Name: Sentinel Security Bot
   5. Username: sentinel_[your_name]_bot
   6. Copy token
   ```

2. **Get Chat ID**
   ```
   1. Start chat with your bot
   2. Send: "Hello"
   3. Visit: https://api.telegram.org/bot<TOKEN>/getUpdates
   4. Copy chat ID number
   ```

3. **Configure**
   ```bash
   # Edit .env.local
   TELEGRAM_BOT_TOKEN=123456789:ABC...
   TELEGRAM_CHAT_ID=123456789
   ```

4. **Test**
   ```bash
   npm run dev
   # Visit: http://localhost:3000
   # Click "Test Telegram Alert" in sidebar
   # Or visit: http://localhost:3000/api/telegram/test
   ```

---

## 📱 Message Types

### 1. Risk Alert Notification (Medium/High Risk)
```
⚠️ Sentinel Security Alert

Transaction detected and being processed:
• From: GDSR...
• To: GBBU...
• Amount: 5000 USDC
• Time: 2025-11-02 15:30 UTC
• Risk: High (score 0.75)

Risk Factors:
✗ New recipient address
✗ Amount 4.1× above normal
✗ Transaction at 03:00 (outside typical 09:00-17:00)

🔐 Guardian multisig required

Queue ID: pending-abc123

[ℹ️ Details] [🔍 Probe]
[🔒 Lock 1h] [✓ Mark Safe]
```

**Triggers:** Risk score ≥ 0.2 (medium or high)  
**Purpose:** Real-time security monitoring and informational actions  
**Flow:** User completes TOTP verification in the app → Transaction is automatically processed → Telegram receives notification

### 2. Post-Transaction Confirmation
```
✅ Transaction Completed

From: GDSR...
To: GBBU...
Amount: 5000 USDC
Hash: 9a8f7d6e...

Transaction has been successfully processed.
```

**Triggers:** After successful transaction  
**Purpose:** Transaction confirmation and audit trail

---

## 🔘 Button Actions

### Informational Buttons (Available in Risk Alerts)

| Button | Action | What Happens |
|--------|--------|--------------|
| **ℹ️ Details** | `DETAILS:{queueId}` | Shows unsigned XDR and transaction details |
| **🔍 Probe** | `PROBE:{queueId}` | Simulates 1 USDC test payment (no real funds) |
| **🔒 Lock 1h** | `LOCK1H:{account}` | Blocks all transactions for 1 hour |
| **✓ Mark Safe** | `MARKSAFE:{recipient}` | Adds recipient to allowlist for future transactions |

**Note:** These are informational and administrative actions. Transaction approval happens automatically in the app after TOTP verification.

---

## 🔄 Complete Flow

### Scenario: High-Risk Transaction

1. **User Action**
   - User attempts to send 5000 USDC to new address at 3 AM

2. **Risk Analysis**
   - `POST /api/risk/score` returns score: 0.75 (HIGH)
   - Factors: new_recipient, z_amount=4.1, off_hours=true

3. **Step-Up Modal**
   - User enters TOTP code (or demo code 123123)
   - Verification succeeds

4. **Guardian Processing**
   - `POST /api/guardian/prepare` creates unsigned XDR
   - Stores in queue with ID: `pending-abc123`
   - Automatically calls guardian cosigner

5. **Telegram Notification** 📲
   - `notifyTelegramRisk()` sends formatted alert
   - Includes all transaction details
   - Shows informational buttons (Details, Probe, Lock, Mark Safe)
   - **Note:** This is a notification - transaction is already being processed

6. **Transaction Completion**
   - Backend requests guardian multisig cosigning
   - User signs in their wallet
   - Transaction submitted to Stellar network

7. **Post-Transaction Notification** 📲
   - After successful submission, Telegram sends:
   - Confirmation message with transaction hash
   - Audit trail for security monitoring

---

## 🧪 Testing Checklist

### Basic Notification
- [ ] Create bot via @BotFather
- [ ] Get chat ID from getUpdates
- [ ] Add to .env.local
- [ ] Restart dev server
- [ ] Visit /api/telegram/test
- [ ] Receive test message ✅

### Medium/High-Risk Transaction Flow
- [ ] Connect wallet
- [ ] Enable TOTP
- [ ] Send large amount to new address
- [ ] Complete TOTP verification in app
- [ ] Transaction processes automatically
- [ ] Receive Telegram notification with risk details
- [ ] See informational buttons (Details, Probe, Lock, Mark Safe)

### Button Interactions (Optional - Requires Webhook)
- [ ] Setup ngrok or deploy to Vercel
- [ ] Register webhook URL with Telegram
- [ ] Trigger medium/high-risk transaction
- [ ] Receive notification in Telegram
- [ ] Click "ℹ️ Details" to view transaction XDR
- [ ] Click "✓ Mark Safe" to add recipient to allowlist
- [ ] Send to same recipient again
- [ ] Verify lower risk score due to allowlist

### Post-Transaction Notification
- [ ] Complete any transaction
- [ ] Receive confirmation message in Telegram
- [ ] Verify transaction hash is included
- [ ] Check message contains all transaction details

---

## 🔧 Environment Variables

```bash
# Required for notifications
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

---

## 🌐 Webhook Setup (Optional - For Button Interactions)

Webhook setup is **optional** and only needed if you want to use informational buttons (Details, Probe, Lock, Mark Safe). The core transaction flow works without webhooks.

### Local Testing with ngrok
```bash
# Terminal 1
npm run dev

# Terminal 2
npx ngrok http 3000
# Copy HTTPS URL: https://abc123.ngrok.io

# Add to .env.local (optional)
TELEGRAM_WEBHOOK_URL=https://abc123.ngrok.io

# Register webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://abc123.ngrok.io/api/telegram/webhook"

# Restart dev server
npm run dev
```

### Production with Vercel
```bash
# Deploy
vercel deploy

# Get URL: https://sentinel.vercel.app

# Register webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://sentinel.vercel.app/api/telegram/webhook"
```

---

## 🐛 Troubleshooting

### "Chat not found"
✅ Start a chat with your bot first  
✅ Send a message  
✅ Check chat ID is correct (no quotes)

### "Unauthorized"
✅ Check bot token in .env.local  
✅ No spaces or line breaks  
✅ Restart dev server

### "Telegram not configured"
✅ Both TOKEN and CHAT_ID must be set  
✅ Restart after changing .env.local

### Buttons not working
✅ Webhook must be configured (HTTPS only)  
✅ Use ngrok for local testing  
✅ Verify: `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"`

---

## 📊 API Endpoints

### GET /api/telegram/test
Send test notification
```bash
curl http://localhost:3000/api/telegram/test
```

### POST /api/telegram/webhook
Receive button callbacks from Telegram (automatic)

### POST /api/guardian/prepare
Create unsigned XDR and send Telegram alert
```bash
curl -X POST http://localhost:3000/api/guardian/prepare \
  -H "Content-Type: application/json" \
  -d '{
    "account": "GDSR...",
    "tx": {
      "to": "GBBU...",
      "amount": 5000,
      "asset": "USDC"
    },
    "score": 0.75,
    "factors": {
      "new_recipient": true,
      "z_amount": 4.1,
      "off_hours": true
    }
  }'
```

---

## 🎯 What Works Now

### ✅ **Without Webhook** (Basic Setup)
- Risk notifications sent to Telegram
- Transaction details in messages
- Queue ID tracking
- Manual approval via API

### ✅ **With Webhook** (Full Setup)
- All of the above, plus:
- Interactive inline buttons
- One-click approve/deny
- Post-transaction confirmation
- Behavior learning loop
- Account locking
- Allowlist management

---

## 🚀 Next Steps

1. **Test Basic Notifications**
   - Follow Quick Start above
   - Verify messages arrive

2. **Setup Webhook** (Optional)
   - Use ngrok for local testing
   - Deploy to Vercel for production

3. **Test Full Flow**
   - Trigger high-risk transaction
   - Approve via Telegram
   - Confirm legitimacy

4. **Deploy to Production**
   - Use Vercel/Netlify
   - Configure environment variables
   - Register production webhook

---

## 📚 Documentation Files

- `TELEGRAM_SETUP_GUIDE.md` - Detailed setup walkthrough
- `TELEGRAM_TESTING.md` - Testing scenarios and commands
- `SENTINEL_COMPLETE_GUIDE.md` - Full system architecture
- `.env.example` - Configuration reference

---

## 🎉 Congratulations!

Your Telegram integration is complete and ready to use!

**Implemented:**
- ✅ Rich notifications with risk details
- ✅ Inline approval buttons
- ✅ Post-transaction confirmation
- ✅ Behavior learning hooks
- ✅ Account locking
- ✅ Allowlist management
- ✅ Test endpoint
- ✅ UI integration

**Ready for demo!** 🚀

---

**Need help?** Check the troubleshooting sections in `TELEGRAM_TESTING.md` or the setup guide.
