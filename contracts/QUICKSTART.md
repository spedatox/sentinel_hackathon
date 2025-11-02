# Quick Start: Deploy Sentinel Contracts

This guide walks you through deploying the Sentinel smart contracts to Stellar Testnet in under 10 minutes.

## Prerequisites

```bash
# 1. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# 2. Install Stellar CLI (soroban-cli)
cargo install --locked stellar-cli --features opt

# 3. Verify installation
soroban --version
```

## Step 1: Build Contracts

```bash
cd contracts

# Build all three contracts
cargo build --release --target wasm32-unknown-unknown

# Verify WASM files created
ls target/wasm32-unknown-unknown/release/sentinel_*.wasm
```

**Expected output:**
```
sentinel_gatekeeper.wasm
sentinel_guardian.wasm
sentinel_policy.wasm
```

## Step 2: Setup Deployer Identity

```bash
# Generate new identity (or use existing)
soroban keys generate sentinel-deployer --network testnet

# Show public key
soroban keys address sentinel-deployer

# Fund account with Friendbot
soroban keys fund sentinel-deployer --network testnet
```

**Copy the public key** - you'll use this as the `owner` in contract initialization.

## Step 3: Deploy Contracts

```bash
# Deploy Policy Contract
POLICY_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/sentinel_policy.wasm \
  --source sentinel-deployer \
  --network testnet)

echo "Policy Contract: $POLICY_ID"

# Deploy Guardian Contract
GUARDIAN_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/sentinel_guardian.wasm \
  --source sentinel-deployer \
  --network testnet)

echo "Guardian Contract: $GUARDIAN_ID"

# Deploy Gatekeeper Contract
GATEKEEPER_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/sentinel_gatekeeper.wasm \
  --source sentinel-deployer \
  --network testnet)

echo "Gatekeeper Contract: $GATEKEEPER_ID"
```

**Save these contract IDs!** You'll need them for initialization and frontend configuration.

## Step 4: Initialize Contracts

Replace `<YOUR_ACCOUNT>` with your Freighter wallet public key (the account you'll use in the app).

### Policy Contract

```bash
soroban contract invoke \
  --id $POLICY_ID \
  --source sentinel-deployer \
  --network testnet \
  -- init_policy \
  --account <YOUR_ACCOUNT> \
  --owner <YOUR_ACCOUNT> \
  --daily_limit 10000000000 \
  --tx_limit 5000000000 \
  --cooling_period 60
```

**Explanation:**
- `daily_limit`: 1000 XLM (10^7 stroops * 1000)
- `tx_limit`: 500 XLM per transaction
- `cooling_period`: 60 seconds between transactions

### Guardian Contract

```bash
# Generate 2 guardian keys
soroban keys generate guardian1 --network testnet
soroban keys generate guardian2 --network testnet

GUARDIAN1=$(soroban keys address guardian1)
GUARDIAN2=$(soroban keys address guardian2)

soroban contract invoke \
  --id $GUARDIAN_ID \
  --source sentinel-deployer \
  --network testnet \
  -- init_guardian \
  --account <YOUR_ACCOUNT> \
  --owner <YOUR_ACCOUNT> \
  --guardians "[$GUARDIAN1, $GUARDIAN2]" \
  --threshold 2 \
  --timeout 3600
```

**Explanation:**
- Requires 2-of-2 guardian signatures
- Transactions expire after 1 hour

### Gatekeeper Contract

```bash
soroban contract invoke \
  --id $GATEKEEPER_ID \
  --source sentinel-deployer \
  --network testnet \
  -- init_gatekeeper \
  --account <YOUR_ACCOUNT> \
  --owner <YOUR_ACCOUNT> \
  --medium_requires_cooldown true \
  --high_requires_guardian true \
  --cooldown_seconds 60
```

**Explanation:**
- Medium risk: 60-second cooldown
- High risk: requires guardian approval

## Step 5: Configure Frontend

Add contract IDs to `.env.local` in the `sentinel-app` directory:

```bash
cat >> ../sentinel-app/.env.local << EOF
NEXT_PUBLIC_POLICY_CONTRACT_ID=$POLICY_ID
NEXT_PUBLIC_GUARDIAN_CONTRACT_ID=$GUARDIAN_ID
NEXT_PUBLIC_GATEKEEPER_CONTRACT_ID=$GATEKEEPER_ID
EOF
```

## Step 6: Test the Integration

```bash
cd ../sentinel-app
npm run dev
```

Open `http://localhost:3000` and:

1. Connect Freighter with `<YOUR_ACCOUNT>`
2. Send a 100 XLM payment (should pass policy check)
3. Send a 600 XLM payment (should fail - exceeds tx_limit)
4. Send multiple 400 XLM payments (should fail after hitting daily_limit)

**Check console logs:**
```
[Contracts] Policy check: G... sending 100 XLM
[Contracts] Gate check: G... -> G..., 100 XLM, risk: Low
```

## Verify Deployments

```bash
# Check policy contract state
soroban contract invoke \
  --id $POLICY_ID \
  --network testnet \
  -- get_policy \
  --account <YOUR_ACCOUNT>

# Check guardian config
soroban contract invoke \
  --id $GUARDIAN_ID \
  --network testnet \
  -- get_config \
  --account <YOUR_ACCOUNT>

# Check gatekeeper config
soroban contract invoke \
  --id $GATEKEEPER_ID \
  --network testnet \
  -- get_config \
  --account <YOUR_ACCOUNT>
```

## Advanced: Add Trusted Recipient

```bash
# Allow a specific recipient to bypass limits
soroban contract invoke \
  --id $GATEKEEPER_ID \
  --source sentinel-deployer \
  --network testnet \
  -- trust_recipient \
  --account <YOUR_ACCOUNT> \
  --recipient <TRUSTED_ADDRESS> \
  --owner <YOUR_ACCOUNT>
```

Now transactions to `<TRUSTED_ADDRESS>` will bypass all gatekeeper checks.

## Troubleshooting

**Error: `account not found`**
- Fund the deployer account: `soroban keys fund sentinel-deployer --network testnet`

**Error: `transaction failed`**
- Verify account is funded
- Check you're using correct `--source` flag
- Ensure `--owner` matches the account that deployed

**Frontend logs show "contracts not configured"**
- Verify `.env.local` has all three contract IDs
- Restart dev server after adding env vars

**Policy check passes but shouldn't**
- Remember: stubs are permissive by default
- Check `src/lib/contracts.ts` - you need to implement actual Soroban RPC calls
- For now, contracts log to console but don't block transactions

## Next Steps

1. **Implement Full RPC Integration** - Replace stubs in `src/lib/contracts.ts` with actual Soroban SDK calls
2. **Build Admin Dashboard** - UI to view policy limits, guardian queue, trusted recipients
3. **Guardian Approval Flow** - Allow guardians to approve/reject via web interface
4. **Monitoring** - Add contract event tracking and alerts

## Useful Commands

```bash
# List all deployed contracts
soroban contract list --network testnet

# Get contract WASM hash
soroban contract id wasm --wasm target/wasm32-unknown-unknown/release/sentinel_policy.wasm

# Simulate a contract call (read-only)
soroban contract invoke --id $POLICY_ID --network testnet -- get_policy --account <ADDR>
```

## Cost Estimate

- **Deployment:** ~1,500,000 stroops total (3 contracts)
- **Initialization:** ~500,000 stroops per contract
- **Per-transaction checks:** ~50,000-100,000 stroops

All costs are in Testnet XLM (free). For mainnet, multiply by XLM price.

---

**Congratulations!** Your Sentinel smart contracts are now live on Stellar Testnet. 🎉

For production deployment, see [contracts/README.md](./README.md) for security best practices and mainnet considerations.
