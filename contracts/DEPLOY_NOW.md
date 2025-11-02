# 🚀 Quick Deployment Guide

## You just installed Rust! Now let's deploy the contracts.

### Step 1: Open a **NEW** PowerShell window (IMPORTANT!)
Close VS Code's terminal and open a fresh PowerShell window.
This is needed because Rust was just installed and the environment needs to be refreshed.

### Step 2: Run these commands one by one:

```powershell
# Navigate to contracts folder
cd "c:\Users\speda\OneDrive\Belgeler\Projects\Hackathon\sentinel-app\contracts"

# Verify cargo is working
cargo --version

# Install Stellar CLI (this takes 5-10 minutes)
cargo install --locked stellar-cli

# Build the contracts (this takes 2-3 minutes)
cargo build --release --target wasm32-unknown-unknown
```

### Step 3: Deploy to Testnet

```powershell
# Create deployer identity
soroban keys generate sentinel-deployer --network testnet

# Fund the account
soroban keys fund sentinel-deployer --network testnet

# Deploy Policy Contract
$POLICY_ID = soroban contract deploy --wasm target/wasm32-unknown-unknown/release/sentinel_policy.wasm --source sentinel-deployer --network testnet
Write-Host "Policy Contract: $POLICY_ID"

# Deploy Guardian Contract
$GUARDIAN_ID = soroban contract deploy --wasm target/wasm32-unknown-unknown/release/sentinel_guardian.wasm --source sentinel-deployer --network testnet
Write-Host "Guardian Contract: $GUARDIAN_ID"

# Deploy Gatekeeper Contract
$GATEKEEPER_ID = soroban contract deploy --wasm target/wasm32-unknown-unknown/release/sentinel_gatekeeper.wasm --source sentinel-deployer --network testnet
Write-Host "Gatekeeper Contract: $GATEKEEPER_ID"
```

### Step 4: Save Contract IDs

Create a file `sentinel-app/.env.local` with:

```env
NEXT_PUBLIC_POLICY_CONTRACT_ID=<your-policy-id>
NEXT_PUBLIC_GUARDIAN_CONTRACT_ID=<your-guardian-id>
NEXT_PUBLIC_GATEKEEPER_CONTRACT_ID=<your-gatekeeper-id>
```

---

## OR - Use the New PowerShell Window I Just Opened

I opened a new PowerShell window for you. In that window, the Stellar CLI installation should be running.

Once it completes:
1. The contracts will automatically build
2. Come back here and I'll help you deploy them!

---

## Troubleshooting

If `cargo` command is not found:
1. Close ALL terminals
2. Open a NEW PowerShell window
3. Rust was just installed and needs a fresh shell

---

**Let me know when the installation in the new window completes, and we'll deploy!** 🚀
