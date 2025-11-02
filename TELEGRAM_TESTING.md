# 🧪 Telegram Testing Guide

## Quick Setup (5 minutes)

### 1. Create Bot
```
1. Open Telegram
2. Search: @BotFather
3. Send: /newbot
4. Name: Sentinel Security Bot
5. Username: sentinel_[your_name]_bot
6. Copy token: 123456789:ABC...
```

### 2. Get Chat ID
```
1. Search for your bot: @sentinel_[your_name]_bot
2. Click "Start"
3. Send message: "Hello"
4. Open in browser:
   https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
5. Find: "chat":{"id": 123456789
6. Copy the chat ID number
```

### 3. Configure Sentinel
```bash
# Edit .env.local
TELEGRAM_BOT_TOKEN=123456789:ABC...
TELEGRAM_CHAT_ID=123456789
```

### 4. Restart & Test
```bash
npm run dev

# Open in browser:
http://localhost:3000/api/telegram/test
```

You should see a test message in Telegram! ✅

---

## Testing Scenarios

### Test 1: Simple Notification
```bash
# Visit this URL:
http://localhost:3000/api/telegram/test

# Expected in Telegram:
⚠️ Sentinel Security Alert
Transaction requires approval
• Amount: 5000 USDC
• Risk: High (score 0.75)
Reasons:
✗ New recipient
✗ Amount 4.1× above normal
✗ Transaction at 03:00
```

### Test 2: High-Risk Transaction
```typescript
// In your app:
1. Connect wallet
2. Send 500 XLM to new address
3. Check Telegram for alert
4. See inline buttons
```

### Test 3: Button Interactions (Requires Webhook)

#### Option A: Local Testing with ngrok
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start ngrok
npx ngrok http 3000

# Copy HTTPS URL (e.g., https://abc123.ngrok.io)
# Add to .env.local:
TELEGRAM_WEBHOOK_URL=https://abc123.ngrok.io

# Register webhook:
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://abc123.ngrok.io/api/telegram/webhook"

# Restart dev server
npm run dev
```

#### Option B: Deploy to Vercel
```bash
vercel deploy

# Get URL (e.g., https://sentinel.vercel.app)
# Add to .env.local:
TELEGRAM_WEBHOOK_URL=https://sentinel.vercel.app

# Register webhook:
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://sentinel.vercel.app/api/telegram/webhook"
```

---

## Button Actions

### ℹ️ Details
- Shows transaction details
- Displays unsigned XDR
- **Action:** `DETAILS:{queueId}`

### 🔍 Probe Transfer
- Simulates 1 USDC test payment
- No actual funds moved
- **Action:** `PROBE:{queueId}`

### 🔒 Lock 1h
- Blocks all transactions for 1 hour
- Emergency stop feature
- **Action:** `LOCK1H:{account}`

### ✅ Approve
- Cosigns transaction
- Submits to Stellar network
- Sends confirmation message
- **Action:** `APPROVE:{queueId}`

### ✓ Mark Safe
- Adds recipient to allowlist
- Reduces future risk scores
- **Action:** `MARKSAFE:{recipient}`

### Post-Transaction Buttons

#### ✅ Yes, it was me
- Confirms transaction was legitimate
- Adds to allowlist
- Updates behavior profile
- **Action:** `CONFIRM_YES:{recipient}`

#### ❌ No, freeze my account
- Locks account for 24 hours
- Blocks all transactions
- Sends security alert
- **Action:** `CONFIRM_NO:{account}`

---

## Message Flow

### 1. Pre-Transaction Alert
```
Trigger: High-risk transaction detected
When: Risk score ≥ 0.6
Contains:
  - Transaction details
  - Risk score
  - Risk factors
  - Action buttons
```

### 2. Post-Transaction Confirmation
```
Trigger: Transaction successfully submitted
When: After any successful transaction
Contains:
  - Transaction hash
  - Amount and recipient
  - Confirmation buttons
Purpose: Behavior learning
```

---

## Troubleshooting

### ❌ "Chat not found"
```
Solution:
1. Make sure you started a chat with your bot
2. Send a message to the bot first
3. Check chat ID is correct (no quotes, just number)
4. Verify bot token is correct
```

### ❌ "Unauthorized"
```
Solution:
1. Check bot token in .env.local
2. No spaces or line breaks in token
3. Token format: 123456789:ABC...
4. Restart dev server
```

### ❌ "Telegram not configured"
```
Solution:
1. Check .env.local has both:
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_CHAT_ID=...
2. Restart dev server: npm run dev
3. Test: http://localhost:3000/api/telegram/test
```

### ❌ Buttons not working
```
Solution:
1. Webhook must be configured
2. URL must be HTTPS (not HTTP)
3. For local testing, use ngrok
4. Verify webhook registration:
   curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

### ❌ No messages received
```
Solution:
1. Check bot token and chat ID are correct
2. Restart dev server after changing .env.local
3. Check browser console for errors
4. Test endpoint: /api/telegram/test
5. Verify bot is not blocked in Telegram
```

---

## Verification Checklist

- [ ] Bot created via @BotFather
- [ ] Bot token saved
- [ ] Started chat with bot
- [ ] Chat ID obtained
- [ ] .env.local configured
- [ ] Dev server restarted
- [ ] Test endpoint returns success
- [ ] Message received in Telegram
- [ ] Buttons visible (if webhook configured)
- [ ] Button clicks work (if webhook configured)

---

## Environment Variables Quick Reference

```bash
# Required for basic notifications
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
TELEGRAM_CHAT_ID=123456789

# Optional for button interactions
TELEGRAM_WEBHOOK_URL=https://your-domain.com
```

---

## API Endpoints

### GET /api/telegram/test
Test notification endpoint
```bash
curl http://localhost:3000/api/telegram/test
```

### POST /api/telegram/webhook
Webhook for button callbacks
```bash
# Telegram sends callbacks here automatically
# You don't call this directly
```

---

## Next Steps

After Telegram is working:

1. **Test all buttons** - Click each button to verify handlers
2. **Test post-confirmation** - Complete transaction, check "Was this you?"
3. **Verify learning** - Mark recipient safe, check allowlist updates
4. **Deploy to production** - Use Vercel with real webhook URL
5. **Add rate limiting** - Prevent spam (future enhancement)

---

## Security Notes

⚠️ **Never share your bot token** - Anyone with it controls your bot  
⚠️ **Use environment variables** - Don't commit tokens to git  
⚠️ **Validate webhooks** - Check X-Telegram-Bot-Api-Secret-Token header  
⚠️ **Use HTTPS only** - Telegram requires HTTPS for webhooks  
⚠️ **Rate limit** - Prevent abuse (implement in production)

---

## Useful Commands

### Check webhook status
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

### Delete webhook
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
```

### Get updates manually
```bash
curl "https://api.telegram.org/bot<TOKEN>/getUpdates"
```

### Send test message
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": 123456789, "text": "Test from curl"}'
```

---

**Ready to test!** 🚀

Follow the Quick Setup above and you'll have Telegram working in 5 minutes.
