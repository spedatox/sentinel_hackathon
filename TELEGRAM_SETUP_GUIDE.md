# 📱 Telegram Bot Setup Guide

## Step 1: Create Your Bot (5 minutes)

### 1.1 Open Telegram
Open Telegram app on your phone or desktop.

### 1.2 Find BotFather
Search for `@BotFather` in Telegram (it's the official bot creation tool).

### 1.3 Create New Bot
Send this command to BotFather:
```
/newbot
```

### 1.4 Choose Bot Name
BotFather will ask for a name. Example:
```
Sentinel Security Bot
```

### 1.5 Choose Bot Username
Must end in "bot". Example:
```
sentinel_security_bot
```

### 1.6 Save Your Token
BotFather will give you a token like:
```
123456789:ABCdefGHIjklMNOpqrsTUVwxyz-1234567
```

⚠️ **IMPORTANT**: Keep this token secret! It controls your bot.

---

## Step 2: Get Your Chat ID (2 minutes)

### 2.1 Start Chat with Your Bot
In Telegram, search for your bot username (e.g., `@sentinel_security_bot`) and click "Start".

### 2.2 Send a Test Message
Send any message to your bot, like:
```
Hello!
```

### 2.3 Get Chat ID
Open this URL in your browser (replace `<YOUR_BOT_TOKEN>` with your actual token):
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```

Look for the `"chat":{"id":` field. Example response:
```json
{
  "ok": true,
  "result": [
    {
      "message": {
        "chat": {
          "id": 123456789,  ← This is your chat ID
          "first_name": "Your Name"
        }
      }
    }
  ]
}
```

Save this chat ID number!

---

## Step 3: Configure Sentinel (1 minute)

### 3.1 Open .env.local
Open `sentinel-app/.env.local` in your editor.

### 3.2 Add Bot Token and Chat ID
Add these lines (replace with your actual values):
```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz-1234567
TELEGRAM_CHAT_ID=123456789

# Webhook URL (for local testing, leave empty)
TELEGRAM_WEBHOOK_URL=
```

### 3.3 Save and Restart Dev Server
```bash
npm run dev
```

---

## Step 4: Test Notifications (2 minutes)

### 4.1 Test Simple Notification
Create a test file `test-telegram.ts`:

```typescript
import { notifyTelegramRisk } from './src/lib/telegram';

async function test() {
  const result = await notifyTelegramRisk({
    account: 'GDSR...',
    recipient: 'GBBU...',
    amount: '5000',
    asset: 'USDC',
    score: 0.75,
    factors: [
      { name: 'new_recipient', value: 1, description: 'New recipient' },
      { name: 'z_amount', value: 4.1, description: '4× typical amount' },
      { name: 'off_hours', value: 1, description: 'Outside normal hours' }
    ],
    queueId: 'test-123'
  });
  
  console.log('Sent:', result);
}

test();
```

Run it:
```bash
npx tsx test-telegram.ts
```

You should receive a message in Telegram!

---

## Step 5: Enable Inline Buttons (Optional)

For inline buttons to work (Approve, Deny, etc.), you need a public webhook URL.

### Option A: Development (ngrok)

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Start ngrok:**
   ```bash
   ngrok http 3000
   ```

3. **Copy HTTPS URL:**
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:3000
   ```

4. **Update .env.local:**
   ```bash
   TELEGRAM_WEBHOOK_URL=https://abc123.ngrok.io
   ```

5. **Register webhook:**
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://abc123.ngrok.io/api/telegram/webhook"
   ```

### Option B: Production (Vercel/Netlify)

1. Deploy to Vercel:
   ```bash
   vercel deploy
   ```

2. Get deployment URL (e.g., `https://sentinel.vercel.app`)

3. Update .env.local:
   ```bash
   TELEGRAM_WEBHOOK_URL=https://sentinel.vercel.app
   ```

4. Register webhook:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://sentinel.vercel.app/api/telegram/webhook"
   ```

---

## Step 6: Test Complete Flow (3 minutes)

### 6.1 Connect Wallet
Open http://localhost:3000 and connect Freighter.

### 6.2 Trigger High-Risk Transaction
- Send large amount (e.g., 500 XLM)
- To a new address
- At an unusual time

### 6.3 Check Telegram
You should receive:
```
⚠️ Sentinel Security Alert

Transaction requires approval:
• To: GBBU98...
• Amount: 500 XLM
• Time: 03:00 UTC
• Risk: High (score 0.75)

Reasons:
✗ New recipient
✗ 4× your typical amount
✗ Off-hours

[ℹ️ Details] [🔍 Probe] [🔒 Lock 1h]
[✅ Approve] [✓ Mark Safe]
```

### 6.4 Click Approve
If webhook is configured, clicking "Approve" will:
- Cosign the transaction
- Submit to Stellar
- Send confirmation message

---

## 🐛 Troubleshooting

### "Chat not found"
- Make sure you started a chat with your bot
- Send a message to the bot first
- Check chat ID is correct

### "Unauthorized"
- Check bot token is correct
- No spaces or line breaks in token
- Token should start with numbers, then colon, then letters

### "Webhook not working"
- Make sure webhook URL is HTTPS (not HTTP)
- Check ngrok is running
- Verify webhook registration:
  ```bash
  curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
  ```

### "No messages received"
- Check .env.local has correct token
- Restart dev server after changing .env.local
- Check console for errors

---

## 🎯 What You'll Get

With Telegram fully configured:

✅ **Pre-transaction alerts** - Get notified before risky transactions  
✅ **Inline approval buttons** - Approve/deny with one click  
✅ **Post-transaction confirmation** - "Was this you?"  
✅ **Behavior learning** - System learns from your responses  
✅ **Account locking** - Emergency freeze for 24 hours  

---

## 🔒 Security Notes

1. **Never share your bot token** - Anyone with it controls your bot
2. **Use environment variables** - Don't commit tokens to git
3. **Validate webhook signatures** - Prevent unauthorized callbacks (already implemented)
4. **Use HTTPS only** - Telegram requires HTTPS for webhooks
5. **Rate limit** - Prevent spam (consider adding rate limiting)

---

## 📚 Next Steps

After Telegram is working:

1. **Test all buttons**: Details, Probe, Lock, Approve, Mark Safe
2. **Test post-confirmation**: "Was this you?" flow
3. **Check behavior learning**: Verify allowlist updates
4. **Deploy to production**: Use Vercel with real webhook URL

---

**Questions?** Check Telegram Bot API docs: https://core.telegram.org/bots/api

**Ready to test!** 🚀
