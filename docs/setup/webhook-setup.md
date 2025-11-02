# Telegram Webhook Setup

## Problem
Telegram button callbacks require a webhook URL to be registered. For local development (localhost:3000), Telegram cannot reach your server.

## Solution Options

### Option 1: Use ngrok (Recommended for Testing)

1. **Install ngrok**: Download from https://ngrok.com/download

2. **Start your Next.js server**:
   ```bash
   npm run dev
   ```

3. **In another terminal, start ngrok**:
   ```bash
   ngrok http 3000
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

5. **Set the webhook** using curl or in browser:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://abc123.ngrok.io/api/telegram/webhook"}'
   ```

   Or visit in browser:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://abc123.ngrok.io/api/telegram/webhook
   ```

6. **Verify webhook is set**:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
   ```

### Option 2: Deploy to Production

Deploy your app to Vercel/Netlify/etc and use the production URL:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-production-domain.com/api/telegram/webhook"}'
```

### Option 3: Remove Webhook (Testing without buttons)

If you just want to test notifications without button functionality:

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook
```

## Quick ngrok Setup

Your bot token: `7292801908:AAF2AElsnoZKS5P8lOBX1_jEfVS_Hxj9Dtk`

After starting ngrok, set webhook with YOUR ngrok URL:
```
https://api.telegram.org/bot7292801908:AAF2AElsnoZKS5P8lOBX1_jEfVS_Hxj9Dtk/setWebhook?url=https://YOUR-NGROK-URL.ngrok.io/api/telegram/webhook
```

Check webhook status:
```
https://api.telegram.org/bot7292801908:AAF2AElsnoZKS5P8lOBX1_jEfVS_Hxj9Dtk/getWebhookInfo
```
