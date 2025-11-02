# 📱 Google Authenticator Setup Guide

## What is Google Authenticator?

Google Authenticator (TOTP - Time-based One-Time Password) is an industry-standard two-factor authentication method that generates 6-digit codes that change every 30 seconds. It's the same technology used by:
- Google accounts
- GitHub
- AWS
- Microsoft accounts
- And thousands of other services

## Why Use It with Sentinel?

When Sentinel detects a **medium-risk transaction** (score 0.3-0.6), it requires a second verification step:

1. **Without TOTP**: You enter the demo code `123123` (not secure)
2. **With TOTP**: You enter the 6-digit code from your authenticator app (secure)

For **high-risk transactions** (score ≥ 0.6), TOTP is still required, plus guardian approval.

---

## 🚀 Setup Instructions

### Step 1: Install an Authenticator App

Choose one of these apps (all free):

#### iOS
- [Google Authenticator](https://apps.apple.com/app/google-authenticator/id388497605)
- [Microsoft Authenticator](https://apps.apple.com/app/microsoft-authenticator/id983156458)
- [Authy](https://apps.apple.com/app/authy/id494168017)

#### Android
- [Google Authenticator](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2)
- [Microsoft Authenticator](https://play.google.com/store/apps/details?id=com.azure.authenticator)
- [Authy](https://play.google.com/store/apps/details?id=com.authy.authy)

### Step 2: Connect Your Wallet to Sentinel

1. Open Sentinel in your browser
2. Click **"Connect Wallet"**
3. Approve connection in Freighter

### Step 3: Setup Google Authenticator

1. Find the **"Enable Google Authenticator"** card in the sidebar
2. Click **"Setup Google Authenticator"**
3. A QR code will appear

### Step 4: Scan the QR Code

1. Open your authenticator app
2. Tap the **"+"** or **"Add account"** button
3. Choose **"Scan QR code"**
4. Point your camera at the QR code on screen
5. The app will add an entry called **"Sentinel (GDSR...)"**

### Step 5: Verify Setup

1. Look at the 6-digit code in your authenticator app
2. Enter it in the **"Enter code to verify"** field in Sentinel
3. Click **"Verify & Enable"**
4. If successful, you'll see **"TOTP Enabled ✓"**

---

## 🔑 Using TOTP for Transactions

### Low Risk Transaction (Score < 0.3)
No TOTP required. Transaction proceeds immediately.

### Medium Risk Transaction (Score 0.3-0.6)
1. Step-up modal appears
2. 30-second cooldown timer
3. **Enter your 6-digit TOTP code**
4. Click **"Verify & Proceed"**
5. Transaction submits

### High Risk Transaction (Score ≥ 0.6)
1. Step-up modal appears
2. 60-second cooldown timer
3. **Enter your 6-digit TOTP code**
4. Transaction queued for guardian approval
5. Telegram notification sent (if configured)
6. Guardian approves → transaction submits

---

## 🛡️ Security Tips

### ✅ Do This
- **Keep your phone secure** with a PIN/password/biometric lock
- **Enable cloud backup** in your authenticator app (Google/Microsoft/Authy all support this)
- **Save backup codes** when generated (future feature)
- **Test TOTP** with a small transaction before relying on it

### ❌ Don't Do This
- **Don't share your TOTP secret** with anyone
- **Don't screenshot the QR code** and save it unencrypted
- **Don't uninstall the authenticator app** without disabling TOTP first in Sentinel
- **Don't use the same device** for wallet and authenticator if possible (reduces single point of failure)

---

## 🔧 Troubleshooting

### "Invalid code" error

**Cause:** Clock sync issue between your phone and server.

**Solution:**
1. Make sure your phone's time is set to **automatic**
2. iOS: Settings → General → Date & Time → Set Automatically
3. Android: Settings → System → Date & Time → Use network-provided time
4. Try again with a fresh code

### "TOTP not enabled" error

**Cause:** Setup wasn't completed.

**Solution:**
1. Go back to the "Setup Google Authenticator" card
2. Click "Setup" again
3. Complete the verification step

### Can't scan QR code

**Solution:**
1. Click **"Can't scan? Enter manually"**
2. Copy the secret key shown
3. In your authenticator app, choose "Enter a setup key" instead of scan
4. Paste the secret
5. Set account name to "Sentinel" and your wallet address
6. Set time-based (default)

### Lost phone / Need to disable TOTP

**Current Solution:**
1. In Sentinel, go to "Setup Google Authenticator" card
2. Click **"Disable"**
3. TOTP will be turned off (falls back to demo code `123123`)

**Future Solution (not yet implemented):**
- Use backup codes (10 single-use codes)
- Contact guardian to override

---

## 🔄 How TOTP Works (Technical)

### Algorithm: TOTP (RFC 6238)
```
TOTP = HOTP(K, T)
where:
  K = shared secret (generated during setup)
  T = floor(current_time / 30) = time step
```

### Properties
- **Time window**: 30 seconds
- **Code length**: 6 digits
- **Tolerance**: ±1 period (allows ±30s clock drift)
- **Hash**: SHA-1 (standard)

### Flow
1. **Setup**:
   - Sentinel generates random secret (Base32)
   - Creates URI: `otpauth://totp/Sentinel:GDSR...?secret=JBSWY3DP...&issuer=Sentinel`
   - Encodes as QR code
   - User scans → secret stored in authenticator app

2. **Verification**:
   - User enters code from app
   - Sentinel calculates expected codes for current ±1 time windows
   - If match → approved
   - If no match → rejected

3. **Storage**:
   - Secret stored in `sentinel.db` (JSON file)
   - Format: `{ "totpSecrets": { "GDSR...": "JBSWY3DP..." } }`
   - **Production**: Should be encrypted or stored in Supabase Vault

---

## 📊 Comparison: Demo Code vs TOTP

| Feature | Demo Code `123123` | Google Authenticator |
|---------|-------------------|----------------------|
| **Security** | ❌ Anyone can use | ✅ Only you have the code |
| **Static** | ❌ Never changes | ✅ Changes every 30s |
| **Brute-force** | ❌ Easy to guess | ✅ 1,000,000 combinations per 30s |
| **Phishing** | ❌ Vulnerable | ✅ Time-bound, harder to steal |
| **Industry Standard** | ❌ Demo only | ✅ Used by Google, GitHub, AWS |
| **Setup Time** | 0 minutes | 2 minutes |

---

## 🎯 Recommended Usage

### For Testing/Demos
- Demo code `123123` is fine
- Quick iterations, no setup needed

### For Real Funds
- **Always use TOTP**
- Takes 2 minutes to set up
- Provides real security
- Industry-proven technology

### For High-Value Accounts
- Enable TOTP
- Configure Telegram bot for guardian approval
- Optional: Deploy smart contracts for on-chain limits
- Consider hardware wallet + TOTP

---

## 🚀 Next Steps

After setting up TOTP:

1. **Test it**: Send a medium-risk transaction (new recipient)
2. **Configure Telegram**: For guardian approval notifications
3. **Review allowlist**: Mark trusted recipients as safe
4. **Check history**: See which transactions triggered TOTP

---

## 📚 Learn More

- [RFC 6238 - TOTP Specification](https://datatracker.ietf.org/doc/html/rfc6238)
- [How TOTP Works (Video)](https://www.youtube.com/watch?v=VOYxF12K1vE)
- [Google Authenticator FAQ](https://support.google.com/accounts/answer/1066447)
- [Why Use 2FA](https://www.cisa.gov/sites/default/files/publications/2FA_FactSheet_508.pdf)

---

**Questions?** Check the [Complete Guide](./SENTINEL_COMPLETE_GUIDE.md) or [Implementation Checklist](./IMPLEMENTATION_CHECKLIST.md).
