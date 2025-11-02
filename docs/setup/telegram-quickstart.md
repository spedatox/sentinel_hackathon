# 🚀 Telegram Quick Start Card

## ⚡ 5-Minute Setup

### Step 1: Create Bot (2 min)
```
Open Telegram → @BotFather
Send: /newbot
Name: Sentinel Security Bot
Username: sentinel_[yourname]_bot
📋 Copy token: 123456789:ABC...
```

### Step 2: Get Chat ID (1 min)
```
1. Find your bot: @sentinel_[yourname]_bot
2. Click "Start"
3. Send: "Hello"
4. Visit: https://api.telegram.org/bot<TOKEN>/getUpdates
5. Copy: "chat":{"id": 123456789
```

### Step 3: Configure (1 min)
```bash
# Edit .env.local
TELEGRAM_BOT_TOKEN=123456789:ABC...
TELEGRAM_CHAT_ID=123456789

# Restart
npm run dev
```

### Step 4: Test (1 min)
```
Visit: http://localhost:3000
Click: "Test Telegram Alert" button
✅ Check Telegram for message
```

---

## 📱 What You'll Receive

### High-Risk Alert
```
⚠️ Sentinel Security Alert
• Amount: 5000 USDC
• Risk: High (score 0.75)
Reasons:
✗ New recipient
✗ 4× above normal
✗ Off-hours

[Approve] [Lock] [Mark Safe]
```

### Post-Transaction
```
✅ Transaction Completed
Amount: 5000 USDC
Hash: 9a8f...

Was this legitimate?
[Yes, it was me] [No, freeze]
```

---

## 🔘 Button Actions

| Button | What It Does |
|--------|-------------|
| ✅ Approve | Cosigns & submits transaction |
| 🔒 Lock 1h | Blocks transactions for 1 hour |
| ✓ Mark Safe | Adds to allowlist (lower risk) |
| Yes, it was me | Learns behavior, updates profile |
| No, freeze | Locks account for 24 hours |

---

## 🧪 Test Commands

```bash
# Test notification
curl http://localhost:3000/api/telegram/test

# Check webhook status
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Get bot info
curl "https://api.telegram.org/bot<TOKEN>/getMe"
```

---

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| "Chat not found" | Start chat with bot first, send message |
| "Unauthorized" | Check token in .env.local, restart |
| "Not configured" | Need both TOKEN and CHAT_ID |
| Buttons don't work | Need webhook (use ngrok or deploy) |

---

## 🌐 Enable Buttons (Optional)

### Using ngrok (Local)
```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: ngrok
npx ngrok http 3000
# Copy: https://abc123.ngrok.io

# Add to .env.local
TELEGRAM_WEBHOOK_URL=https://abc123.ngrok.io

# Register webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://abc123.ngrok.io/api/telegram/webhook"

# Restart dev server
npm run dev
```

### Using Vercel (Production)
```bash
vercel deploy
# URL: https://sentinel.vercel.app

curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://sentinel.vercel.app/api/telegram/webhook"
```

---

## ✅ Quick Checklist

- [ ] Created bot via @BotFather
- [ ] Got bot token
- [ ] Started chat with bot
- [ ] Got chat ID from getUpdates
- [ ] Added TOKEN and CHAT_ID to .env.local
- [ ] Restarted dev server
- [ ] Visited /api/telegram/test
- [ ] Received test message in Telegram ✅
- [ ] (Optional) Setup ngrok for buttons
- [ ] (Optional) Registered webhook

---

## 📚 Full Guides

- **Setup:** `TELEGRAM_SETUP_GUIDE.md`
- **Testing:** `TELEGRAM_TESTING.md`
- **Implementation:** `TELEGRAM_IMPLEMENTATION.md`

---

## 🎯 Ready!

Your Telegram bot is configured and ready to send real-time security alerts!

**Try it:** Send a high-risk transaction and watch the magic happen 🎉

---

**Need help?** Check the full setup guide or troubleshooting section.
