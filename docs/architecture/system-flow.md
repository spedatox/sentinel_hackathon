# 📊 Sentinel System Flow Diagrams

## 🔄 Complete Transaction Lifecycle

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER INITIATES PAYMENT                       │
│                    (Freighter Wallet Connected)                      │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      FETCH TRANSACTION HISTORY                       │
│                   (Horizon API - Last 60 Payments)                   │
│                                                                      │
│  • GET /accounts/{address}/payments?limit=60                        │
│  • Parse amounts, recipients, timestamps, assets                    │
│  • Build behavioral profile                                         │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      FEATURE EXTRACTION                              │
│                                                                      │
│  1. Amount Analysis                                                  │
│     • Calculate: mean, std, p95 of past amounts                     │
│     • Compute: z_score = (current - mean) / std                     │
│                                                                      │
│  2. Recipient Analysis                                               │
│     • Check: Is this address new? (never sent before)               │
│     • Calculate: % of funds going to top recipient                  │
│                                                                      │
│  3. Temporal Analysis                                                │
│     • Build: 24-hour histogram of past transaction times            │
│     • Detect: Is current hour outside typical 8-hour window?        │
│                                                                      │
│  4. Frequency Analysis                                               │
│     • Count: Today's transactions vs daily average                  │
│     • Calculate: freq_spike_ratio = today / avg                     │
│                                                                      │
│  5. Asset Analysis                                                   │
│     • Track: Asset distribution (XLM%, USDC%, other%)               │
│     • Measure: L1 distance from typical distribution                │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      RISK SCORING ENGINE                             │
│                                                                      │
│  score = 0.00                                                        │
│    + 0.25 × min(1, z_amount/3)           // Amount anomaly          │
│    + 0.20 × (new_recipient ? 1 : 0)      // New address             │
│    + 0.15 × (off_hours ? 1 : 0)          // Time anomaly            │
│    + 0.15 × min(1, freq_spike/5)         // Frequency surge         │
│    + 0.10 × min(1, asset_mix_l1)         // Asset distribution      │
│    + 0.15 × min(1, concentration)        // Recipient focus         │
│                                                                      │
│  Bucket Assignment:                                                  │
│    • 0.0 - 0.3 → LOW                                                │
│    • 0.3 - 0.6 → MEDIUM                                             │
│    • 0.6 - 1.0 → HIGH                                               │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      AI EXPLANATION LAYER                            │
│                                                                      │
│  IF OPENAI_API_KEY set:                                             │
│    • Send: {transaction, factors, score} to GPT-4o-mini             │
│    • Prompt: "Explain risk in plain language"                       │
│    • Receive: Natural language narrative                            │
│    • Source: "ai"                                                   │
│                                                                      │
│  ELSE:                                                               │
│    • Use deterministic template                                     │
│    • Map factors → human-readable phrases                           │
│    • Combine into explanation                                       │
│    • Source: "rules"                                                │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────┴─────────┐
                    │   RISK BUCKET?    │
                    └─┬────────┬────────┬┘
          ┌───────────┘        │        └───────────┐
          │                    │                    │
      LOW (< 0.3)          MEDIUM              HIGH (≥ 0.6)
          │                (0.3-0.6)               │
          │                    │                    │
          ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  ALLOW           │  │  STEP-UP         │  │  STEP-UP         │
│  IMMEDIATELY     │  │  REQUIRED        │  │  + GUARDIAN      │
│                  │  │                  │  │                  │
│  • Green badge   │  │  • Yellow badge  │  │  • Red badge     │
│  • No delay      │  │  • 30s cooldown  │  │  • 60s cooldown  │
│  • Auto-submit   │  │  • TOTP check    │  │  • TOTP check    │
│                  │  │                  │  │  • Queue XDR     │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                      │
         │                     ▼                      ▼
         │            ┌──────────────────┐  ┌──────────────────┐
         │            │  CHECK TOTP      │  │  CHECK TOTP      │
         │            │  STATUS          │  │  STATUS          │
         │            └────────┬─────────┘  └────────┬─────────┘
         │                     │                      │
         │         ┌───────────┴────────┐  ┌─────────┴──────────┐
         │         │                    │  │                    │
         │   ENABLED               DISABLED   ENABLED       DISABLED
         │         │                    │  │                    │
         │         ▼                    ▼  ▼                    ▼
         │   ┌──────────┐        ┌──────────┐  ┌──────────┐  ┌──────────┐
         │   │ Verify   │        │ Demo     │  │ Verify   │  │ Demo     │
         │   │ TOTP     │        │ Code     │  │ TOTP     │  │ Code     │
         │   │ (6-digit)│        │ 123123   │  │ (6-digit)│  │ 123123   │
         │   └────┬─────┘        └────┬─────┘  └────┬─────┘  └────┬─────┘
         │        │                   │             │             │
         │        └─────────┬─────────┘             │             │
         │                  │                       │             │
         │                  ▼                       ▼             ▼
         │          ┌──────────────────┐   ┌──────────────────────────┐
         │          │  SIGN & SUBMIT   │   │  CREATE UNSIGNED XDR     │
         │          │  TRANSACTION     │   │  • Build transaction      │
         │          │                  │   │  • Store in queue         │
         │          │  • User signs    │   │  • Generate queue ID      │
         │          │  • Submit Horizon│   │                           │
         │          └────────┬─────────┘   └────────┬─────────────────┘
         │                   │                      │
         │                   │                      ▼
         │                   │             ┌──────────────────────────┐
         │                   │             │  NOTIFY TELEGRAM         │
         │                   │             │                          │
         │                   │             │  IF TELEGRAM_BOT_TOKEN:  │
         │                   │             │   • Send alert message   │
         │                   │             │   • Add inline buttons:  │
         │                   │             │     - ℹ️ Details         │
         │                   │             │     - 🔍 Probe           │
         │                   │             │     - 🔒 Lock 1h         │
         │                   │             │     - ✅ Approve         │
         │                   │             │     - ✓ Mark Safe       │
         │                   │             │                          │
         │                   │             │  ELSE:                   │
         │                   │             │   • Log queue ID         │
         │                   │             │   • Manual approve later │
         │                   │             └────────┬─────────────────┘
         │                   │                      │
         │                   │                      ▼
         │                   │             ┌──────────────────────────┐
         │                   │             │  WAIT FOR GUARDIAN       │
         │                   │             │  APPROVAL                │
         │                   │             │                          │
         │                   │             │  User clicks "Approve"   │
         │                   │             │  in Telegram             │
         │                   │             └────────┬─────────────────┘
         │                   │                      │
         │                   │                      ▼
         │                   │             ┌──────────────────────────┐
         │                   │             │  GUARDIAN COSIGN         │
         │                   │             │                          │
         │                   │             │  • Fetch XDR from queue  │
         │                   │             │  • Add guardian sig      │
         │                   │             │  • Submit to Horizon     │
         │                   │             └────────┬─────────────────┘
         │                   │                      │
         └───────────────────┴──────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  TRANSACTION     │
                    │  SUBMITTED       │
                    │                  │
                    │  • Get tx hash   │
                    │  • Show success  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────────────┐
                    │  POST-TRANSACTION        │
                    │  CONFIRMATION            │
                    │                          │
                    │  IF TELEGRAM_BOT_TOKEN:  │
                    │   • Send: "Was this you?"│
                    │   • Buttons:             │
                    │     - Yes, it was me     │
                    │     - No, freeze account │
                    │                          │
                    │  User Response:          │
                    └────────┬─────────────────┘
                             │
                 ┌───────────┴────────────┐
                 │                        │
            YES (Confirm)           NO (Fraud)
                 │                        │
                 ▼                        ▼
    ┌──────────────────────┐   ┌──────────────────────┐
    │  LEARN BEHAVIOR      │   │  LOCK ACCOUNT        │
    │                      │   │                      │
    │  • Add recipient to  │   │  • Set lock flag     │
    │    allowlist         │   │  • Expire: 24 hours  │
    │  • Update avg_amount │   │  • Block all txs     │
    │  • Update hour_hist  │   │  • Alert user        │
    │  • Reduce future     │   │                      │
    │    false positives   │   │                      │
    └──────────────────────┘   └──────────────────────┘
```

---

## 🔐 TOTP Setup Flow

```
┌─────────────────────────────────────────────────────────────┐
│              USER CLICKS "SETUP GOOGLE AUTHENTICATOR"       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         POST /api/auth/totp/setup                           │
│         Body: { account: "GDSR..." }                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         GENERATE SECRET                                     │
│                                                             │
│  import { TOTP } from 'otpauth';                           │
│  const secret = TOTP.generate();                           │
│    → "JBSWY3DPEHPK3PXP"                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         CREATE URI                                          │
│                                                             │
│  const totp = new TOTP({                                   │
│    issuer: 'Sentinel',                                     │
│    label: account.slice(0, 8) + '...',                     │
│    algorithm: 'SHA1',                                      │
│    digits: 6,                                              │
│    period: 30,                                             │
│    secret: secret                                          │
│  });                                                       │
│                                                             │
│  uri = totp.toString();                                    │
│    → "otpauth://totp/Sentinel:GDSR...?secret=...&issuer=..." │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         GENERATE QR CODE                                    │
│                                                             │
│  qrUri = "https://api.qrserver.com/v1/create-qr-code/"    │
│         + "?size=300x300&data=" + encodeURIComponent(uri)  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         RETURN TO CLIENT                                    │
│                                                             │
│  {                                                          │
│    secret: "JBSWY3DPEHPK3PXP",                             │
│    uri: "otpauth://...",                                   │
│    qrUri: "https://api.qrserver.com/..."                  │
│  }                                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         DISPLAY QR CODE                                     │
│                                                             │
│  <img src={qrUri} alt="QR Code" />                        │
│  <p>Secret: {secret}</p>                                   │
│  <button>Can't scan? Enter manually</button>               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────┴─────────────┐
         │                           │
    SCAN QR CODE              MANUAL ENTRY
         │                           │
         ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│  Authenticator   │       │  Copy secret     │
│  App scans       │       │  Paste in app    │
│  QR code         │       │  Set account:    │
│                  │       │  "Sentinel"      │
│  → Adds entry    │       │  → Adds entry    │
│    "Sentinel     │       │    "Sentinel     │
│     (GDSR...)"   │       │     (GDSR...)"   │
└────────┬─────────┘       └────────┬─────────┘
         │                           │
         └─────────────┬─────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         USER SEES 6-DIGIT CODE IN APP                       │
│                                                             │
│  Google Authenticator:                                     │
│  ┌─────────────────────┐                                  │
│  │ Sentinel (GDSR...)  │                                  │
│  │      123 456        │  ← Changes every 30s             │
│  │  ●●●●●●●●○○○○○○○○    │  ← Time remaining               │
│  └─────────────────────┘                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         USER ENTERS CODE IN SENTINEL                        │
│                                                             │
│  <input value="123456" />                                  │
│  <button>Verify & Enable</button>                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         POST /api/auth/totp/verify                          │
│         Body: { account: "GDSR...", code: "123456" }        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         VERIFY CODE                                         │
│                                                             │
│  const totp = new TOTP({ secret });                        │
│  const valid = totp.validate({                             │
│    token: code,                                            │
│    window: 1  // Allow ±30s clock drift                   │
│  });                                                       │
│                                                             │
│  IF valid !== null:                                        │
│    → Save secret to storage                                │
│    → Return { valid: true }                                │
│  ELSE:                                                      │
│    → Return { valid: false }                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
                ┌──────┴──────┐
                │   VALID?    │
                └─┬─────────┬─┘
             YES │         │ NO
                 │         │
                 ▼         ▼
    ┌──────────────┐  ┌──────────────┐
    │  SUCCESS     │  │  ERROR       │
    │              │  │              │
    │  • Show ✓    │  │  • Show ✗    │
    │  • "Enabled" │  │  • "Invalid  │
    │              │  │    code"     │
    └──────────────┘  └──────────────┘
```

---

## 🤖 AI Explanation Flow

```
┌─────────────────────────────────────────────────────────────┐
│         USER CLICKS "EXPLAIN" ON TRANSACTION                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         POST /api/risk/explain                              │
│         Body: { score, factors, bucket, account, to }       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         CHECK OPENAI_API_KEY                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    API KEY SET              NO API KEY
         │                           │
         ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│  AI PATH         │       │  TEMPLATE PATH   │
└────────┬─────────┘       └────────┬─────────┘
         │                           │
         ▼                           ▼
┌──────────────────────────┐ ┌──────────────────────────┐
│  Build Prompt            │ │  Use listFactorHighlights│
│                          │ │                          │
│  System:                 │ │  factors.forEach(f => {  │
│  "You are Sentinel's     │ │    if (f.name === 'new') │
│   risk analyst..."       │ │      text += "New..."    │
│                          │ │    if (f.name === 'z')   │
│  User:                   │ │      text += "Amount..." │
│  "Score: 0.75            │ │    ...                   │
│   Factors: new_recipient,│ │  });                     │
│   z_amount=4.1,          │ │                          │
│   off_hours=true"        │ │  return {                │
│                          │ │    text,                 │
│  Response format:        │ │    source: "rules"       │
│  {                       │ │  }                       │
│    explanation: string   │ │                          │
│  }                       │ │                          │
└────────┬─────────────────┘ └────────┬─────────────────┘
         │                           │
         ▼                           │
┌──────────────────────────┐        │
│  Call OpenAI API         │        │
│                          │        │
│  const response =        │        │
│    await openai.chat     │        │
│      .completions        │        │
│      .create({           │        │
│    model: 'gpt-4o-mini', │        │
│    messages,             │        │
│    temperature: 0.7      │        │
│  });                     │        │
└────────┬─────────────────┘        │
         │                           │
         ▼                           │
┌──────────────────────────┐        │
│  Extract Explanation     │        │
│                          │        │
│  explanation =           │        │
│    response.choices[0]   │        │
│      .message.content;   │        │
│                          │        │
│  return {                │        │
│    text: explanation,    │        │
│    source: "ai"          │        │
│  }                       │        │
└────────┬─────────────────┘        │
         │                           │
         └─────────────┬─────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         RETURN EXPLANATION TO CLIENT                        │
│                                                             │
│  {                                                          │
│    text: "This transaction raised a red flag...",          │
│    source: "ai" | "rules"                                  │
│  }                                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         DISPLAY IN INSIGHTS DRAWER                          │
│                                                             │
│  <InsightsDrawer>                                          │
│    <p>{explanation.text}</p>                               │
│    <Badge>{explanation.source}</Badge>                     │
│  </InsightsDrawer>                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 💬 Telegram Bot Flow

```
┌─────────────────────────────────────────────────────────────┐
│         HIGH-RISK TRANSACTION DETECTED                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         CHECK TELEGRAM_BOT_TOKEN                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    TOKEN SET                 NO TOKEN
         │                           │
         ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│  NOTIFY BOT      │       │  SKIP TELEGRAM   │
│                  │       │  (Manual approve │
│                  │       │   via API later) │
└────────┬─────────┘       └──────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│         BUILD MESSAGE                                       │
│                                                             │
│  ⚠️ **Sentinel Security Alert**                            │
│                                                             │
│  Transaction requires approval:                            │
│  • To: GBBU98...                                           │
│  • Amount: 5000 USDC                                       │
│  • Time: 03:00 UTC                                         │
│  • Risk: High (score 0.75)                                 │
│                                                             │
│  **Reasons:**                                              │
│  ✗ New recipient                                           │
│  ✗ 4× your typical amount                                 │
│  ✗ Off-hours (outside 09:00-17:00)                        │
│                                                             │
│  Inline Keyboard:                                          │
│  [ℹ️ Details] [🔍 Probe] [🔒 Lock 1h]                      │
│  [✅ Approve] [✓ Mark Safe]                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         SEND TO TELEGRAM                                    │
│                                                             │
│  await fetch(                                              │
│    `https://api.telegram.org/bot${token}/sendMessage`,    │
│    {                                                       │
│      method: 'POST',                                       │
│      body: JSON.stringify({                                │
│        chat_id: userId,                                    │
│        text: message,                                      │
│        reply_markup: {                                     │
│          inline_keyboard: buttons                          │
│        }                                                   │
│      })                                                    │
│    }                                                       │
│  );                                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         USER SEES MESSAGE IN TELEGRAM                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    CLICKS BUTTON              IGNORES
         │                           │
         ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│  TELEGRAM SENDS  │       │  TRANSACTION     │
│  CALLBACK        │       │  STAYS QUEUED    │
│                  │       │  (Manual approve │
│  POST webhook    │       │   later)         │
│  {               │       └──────────────────┘
│    callback_id,  │
│    data: "APPROVE"│
│  }               │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│         POST /api/telegram/webhook                          │
│         (Telegram Bot API callback)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         PARSE CALLBACK                                      │
│                                                             │
│  const data = req.body.callback_query.data;                │
│  // "APPROVE", "LOCK1H", "MARKSAFE", etc.                  │
│                                                             │
│  switch (data) {                                           │
│    case 'APPROVE':                                         │
│      → Call /api/guardian/approve                          │
│    case 'LOCK1H':                                          │
│      → Set account lock flag                               │
│    case 'MARKSAFE':                                        │
│      → Add recipient to allowlist                          │
│    ...                                                     │
│  }                                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         EXECUTE ACTION                                      │
│                                                             │
│  IF APPROVE:                                               │
│    • Fetch unsigned XDR from queue                         │
│    • Add guardian signature                                │
│    • Submit to Horizon                                     │
│    • Send success message                                  │
│                                                             │
│  IF LOCK1H:                                                │
│    • Set lock flag in storage                              │
│    • Expire: Date.now() + 3600000                          │
│    • Send confirmation                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         SEND CONFIRMATION TO TELEGRAM                       │
│                                                             │
│  ✅ Transaction approved and submitted                      │
│  Hash: 9a8f7d6e...                                         │
│                                                             │
│  Was this transaction legitimate?                          │
│  [Yes, it was me] [No, freeze my account]                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         USER RESPONDS                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    YES (Confirm)              NO (Fraud)
         │                           │
         ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│  LEARN           │       │  LOCK ACCOUNT    │
│                  │       │                  │
│  • Add to        │       │  • 24h lock      │
│    allowlist     │       │  • Alert user    │
│  • Update stats  │       │  • Log incident  │
│  • Send: "Noted!"│       │  • Send: "Locked"│
└──────────────────┘       └──────────────────┘
```

---

These diagrams show the complete system flow from user action to transaction completion, including all security layers, decision points, and integrations!
