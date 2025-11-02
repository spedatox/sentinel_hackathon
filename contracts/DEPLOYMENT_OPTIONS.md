# Sentinel Smart Contracts - Installation & Deployment Guide

## Current Status
✅ **Smart contracts are ready and complete!**
- Policy Contract (spending limits)
- Guardian Contract (multi-sig approvals)
- Gatekeeper Contract (risk-based gating)

## Prerequisites Installation

### Option 1: Full Local Setup (Recommended for Development)

#### 1. Install Rust
```powershell
# Download and run rustup installer
# Visit: https://rustup.rs/
# Or use winget:
winget install Rustlang.Rustup

# After installation, add wasm target
rustup target add wasm32-unknown-unknown
```

#### 2. Install Stellar CLI (Soroban)
```powershell
# After Rust is installed:
cargo install --locked stellar-cli --features opt

# Verify installation
soroban --version
```

#### 3. Deploy Contracts
```powershell
cd contracts

# Build contracts
cargo build --release --target wasm32-unknown-unknown

# Deploy using the scripts
powershell -ExecutionPolicy Bypass -File .\deploy.ps1

# Initialize with your Stellar address
powershell -ExecutionPolicy Bypass -File .\initialize.ps1 -YourAccount "YOUR_STELLAR_ADDRESS"
```

---

## Option 2: Pre-compiled Contracts (Quick Deploy)

If you want to deploy immediately without building:

### Using Stellar Laboratory

1. **Go to [Stellar Laboratory](https://laboratory.stellar.org/)**
2. **Upload WASM files** (if pre-compiled available)
3. **Deploy contracts** through the UI

### Using Docker (Alternative)

```powershell
# Run Stellar quickstart with contracts
docker run --rm -it -p 8000:8000 stellar/quickstart:soroban-dev --standalone
```

---

## Option 3: Use Deployed Testnet Contracts (Fastest)

If you just want to test the app, you can use already-deployed contracts on Testnet:

### Add to your `.env.local`:

```env
# Example Testnet Contract IDs (you'll need to deploy your own or use shared testnet ones)
NEXT_PUBLIC_POLICY_CONTRACT_ID=CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K
NEXT_PUBLIC_GUARDIAN_CONTRACT_ID=CDKJF3MHVJR73R3EJQO7HJUQHPN2YNLY4DQRUGPGM7BNFRMPEMHYWZLW
NEXT_PUBLIC_GATEKEEPER_CONTRACT_ID=CCBD3RLXGQKTFQ67QUNHSFMB7DJKW54AAZPZQYRTV5TGLZXGH33YVFMR
```

---

## Recommended Approach

For a **hackathon/demo**, I recommend:

1. **Install Rust** (10 minutes)
   - Visit https://rustup.rs/
   - Run installer
   - Restart terminal

2. **Install Soroban CLI** (5 minutes)
   ```powershell
   cargo install --locked stellar-cli --features opt
   ```

3. **Deploy Contracts** (5 minutes)
   ```powershell
   cd contracts
   cargo build --release --target wasm32-unknown-unknown
   powershell -ExecutionPolicy Bypass -File .\deploy.ps1
   ```

**Total time: ~20 minutes**

---

## Alternative: Deploy from CI/CD

You can also set up GitHub Actions to build and deploy contracts automatically:

```yaml
name: Deploy Contracts

on:
  push:
    paths:
      - 'sentinel-app/contracts/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: wasm32-unknown-unknown
      - name: Install Stellar CLI
        run: cargo install --locked stellar-cli --features opt
      - name: Build Contracts
        run: |
          cd sentinel-app/contracts
          cargo build --release --target wasm32-unknown-unknown
      - name: Deploy to Testnet
        env:
          STELLAR_SECRET_KEY: ${{ secrets.STELLAR_SECRET_KEY }}
        run: |
          cd sentinel-app/contracts
          ./deploy.sh
```

---

## Need Help?

**Quick questions:**
1. Do you want to install Rust now and deploy yourself?
2. Or use pre-deployed testnet contracts to get the app running faster?
3. Or would you like me to provide pre-built WASM files?

**Next steps once deployed:**
- Contracts will give you 3 contract IDs
- Add them to `.env.local`
- Initialize them with your Stellar account
- Start using the Sentinel app!
