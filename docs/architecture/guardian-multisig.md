# Guardian Multisig Setup Guide

## Overview

Sentinel uses **Guardian multisig** for high-risk transactions (score ≥ 0.5). This adds a second signature requirement that protects against wallet compromise.

## Security Model

- **Low Risk** (< 0.2): Direct send, Telegram notification only
- **Medium Risk** (0.2 - 0.5): TOTP + Telegram confirmation
- **High Risk** (≥ 0.5): TOTP + Telegram confirmation + **Guardian multisig signature**

## Setup Steps

### 1. Generate Guardian Keypair

Go to [Stellar Laboratory - Account Creator](https://laboratory.stellar.org/#account-creator?network=test)

1. Click "Generate keypair"
2. **Save both keys securely:**
   - Public Key: `G...` (56 characters)
   - Secret Key: `S...` (56 characters)

⚠️ **IMPORTANT**: The secret key must NEVER be committed to version control!

### 2. Add Guardian as Signer to Your Stellar Account

#### Option A: Using Stellar Laboratory (Testnet)

1. Go to [Transaction Builder](https://laboratory.stellar.org/#txbuilder?network=test)
2. Source Account: **Your wallet address**
3. Click "Fetch next sequence number"
4. Operation Type: **Set Options**
5. Add Signer:
   - Signer Type: `Ed25519 Public Key`
   - Signer Key: **Guardian public key** (from step 1)
   - Signer Weight: `1`
6. Set Thresholds (important!):
   - Low Threshold: `1`
   - Medium Threshold: `1`
   - High Threshold: `2` (requires YOUR signature + Guardian signature)
7. Sign with your wallet (Freighter/Albedo)
8. Submit to network

#### Option B: Using Freighter Wallet

Currently Freighter doesn't support adding signers directly. Use Laboratory method above.

### 3. Configure Sentinel

Add Guardian secret key to `.env.local`:

```bash
GUARDIAN_SECRET_KEY=SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Restart your dev server:
```bash
npm run dev
```

### 4. Verify Setup

Test that Guardian is working:

```bash
# Check Guardian configuration
curl http://localhost:3000/api/guardian/status

# Should return:
{
  "configured": true,
  "method": "local_key"
}
```

## How It Works

### Transaction Flow

1. User initiates high-risk transaction
2. TOTP authentication required
3. Transaction queued for Guardian approval
4. Telegram notification sent
5. User approves via Telegram
6. **Guardian automatically signs with second key**
7. Transaction submitted to Stellar with 2 signatures
8. Stellar network verifies both signatures before accepting

### Why This is Secure

Even if an attacker:
- ✅ Steals your wallet private key
- ✅ Steals your TOTP secret
- ✅ Gets access to your Telegram

They **CANNOT** send high-risk transactions because:
- ❌ They don't have the Guardian secret key
- ❌ Guardian key is stored server-side only
- ❌ Stellar network requires 2 signatures for high-threshold operations

## Threshold Explanation

Stellar accounts have 3 operation thresholds:

| Threshold | Weight Required | Operations | Sentinel Usage |
|-----------|----------------|------------|----------------|
| **Low** | 1 | Allow Trust, Bump Sequence | Not used |
| **Medium** | 1 | Payments, Path Payments | Standard transactions |
| **High** | 2 | Set Options, Account Merge | High-risk payments |

With Guardian setup:
- Your wallet key: weight = 1 (master key)
- Guardian key: weight = 1 (added signer)
- High threshold = 2 (requires both)

## Troubleshooting

### Error: "Guardian not configured"

Check `.env.local` has `GUARDIAN_SECRET_KEY` set and restart server.

### Error: "tx_bad_auth" when approving

Your Guardian key is not added to the account. Repeat step 2.

### Error: "Invalid secret key"

Guardian secret key in `.env.local` is malformed. Should start with `S` and be 56 characters.

### Transaction stuck in "waiting for approval"

Check Telegram for notification. Click Approve button. Guardian will sign automatically.

## Production Considerations

### Key Storage

For production, **DO NOT** store Guardian secret key in `.env` file:

1. Use environment variables in deployment platform (Vercel, AWS, etc.)
2. Use secrets management service (AWS Secrets Manager, HashiCorp Vault)
3. Use hardware security module (HSM) for enterprise deployments

### Guardian Key Rotation

To rotate Guardian key:

1. Generate new Guardian keypair
2. Add new Guardian as signer (weight=1)
3. Update `.env.local` with new secret
4. Remove old Guardian signer
5. All done! High-risk transactions now use new key

### Backup Recovery

If Guardian key is lost:

1. You can still send low/medium risk transactions (only need your wallet key)
2. For high-risk, you need to:
   - Remove Guardian signer from account (requires your master key)
   - Set high threshold back to 1
   - Add new Guardian
   - Set high threshold to 2

## Architecture

```
┌─────────────────┐
│  User's Wallet  │ Weight = 1 (Master Key)
│  (Freighter)    │
└────────┬────────┘
         │
         │ Signs transaction
         │
         ▼
┌─────────────────┐
│ Sentinel Server │
│                 │
│ ┌─────────────┐ │
│ │  Guardian   │ │ Weight = 1 (Co-signer)
│ │ Secret Key  │ │
│ └─────────────┘ │
└────────┬────────┘
         │
         │ Adds second signature
         │
         ▼
┌─────────────────┐
│ Stellar Network │ Requires 2 signatures
│ High Threshold  │ for high-risk operations
└─────────────────┘
```

## Security Best Practices

1. ✅ **Never** commit Guardian secret to git
2. ✅ Store Guardian key separately from wallet key
3. ✅ Use different devices for wallet and Guardian if possible
4. ✅ Monitor Guardian usage logs
5. ✅ Rotate Guardian key periodically
6. ✅ Test threshold setup on testnet first
7. ✅ Keep backup of Guardian key in secure location

## FAQ

**Q: Can I use hardware wallet as Guardian?**
A: Not directly. Guardian needs to sign programmatically. Use HSM for production.

**Q: What if Guardian service is down?**
A: Low/medium risk transactions still work. High-risk will queue until Guardian is back.

**Q: Can I have multiple Guardians?**
A: Yes! Add multiple signers with weight=1 each, increase high threshold accordingly.

**Q: Does this cost more in Stellar fees?**
A: No. Adding signer costs 0.5 XLM base reserve. Transaction fees remain the same.

**Q: Can attacker disable Guardian?**
A: No. Removing signer requires high-threshold operation, which requires Guardian signature itself!

## Next Steps

- [x] Setup Guardian multisig
- [ ] Test with low-risk transaction (should work normally)
- [ ] Test with high-risk transaction (should require Guardian)
- [ ] Monitor Telegram notifications
- [ ] Check transaction history on Stellar Explorer
- [ ] Deploy to production with secure key storage

---

**Need Help?** Check the [Stellar Documentation on Multisig](https://developers.stellar.org/docs/encyclopedia/signatures-multisig)
