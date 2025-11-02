# Sentinel Smart Contracts Deployment Script
# This script builds and deploys all three contracts to Stellar Testnet

Write-Host "🚀 Sentinel Smart Contracts Deployment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check if soroban is installed
if (!(Get-Command soroban -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Soroban CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   cargo install --locked stellar-cli --features opt" -ForegroundColor White
    exit 1
}

# Check if we're in the contracts directory
if (!(Test-Path "Cargo.toml")) {
    Write-Host "❌ Please run this script from the contracts directory" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor Green
Write-Host ""

# Step 1: Build contracts
Write-Host "📦 Building contracts..." -ForegroundColor Yellow
cargo build --release --target wasm32-unknown-unknown

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful" -ForegroundColor Green
Write-Host ""

# Step 2: Setup deployer identity
Write-Host "🔑 Setting up deployer identity..." -ForegroundColor Yellow

$identityExists = soroban keys show sentinel-deployer 2>$null
if (!$identityExists) {
    Write-Host "Creating new identity 'sentinel-deployer'..." -ForegroundColor Cyan
    soroban keys generate sentinel-deployer --network testnet
    
    Write-Host "Funding account with Friendbot..." -ForegroundColor Cyan
    soroban keys fund sentinel-deployer --network testnet
    Start-Sleep -Seconds 5
}

$deployerAddress = soroban keys address sentinel-deployer
Write-Host "✅ Deployer address: $deployerAddress" -ForegroundColor Green
Write-Host ""

# Step 3: Deploy contracts
Write-Host "🚀 Deploying contracts to Testnet..." -ForegroundColor Yellow
Write-Host ""

# Deploy Policy Contract
Write-Host "Deploying Policy Contract..." -ForegroundColor Cyan
$POLICY_ID = soroban contract deploy `
    --wasm target/wasm32-unknown-unknown/release/sentinel_policy.wasm `
    --source sentinel-deployer `
    --network testnet

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Policy contract deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Policy Contract: $POLICY_ID" -ForegroundColor Green
Write-Host ""

# Deploy Guardian Contract
Write-Host "Deploying Guardian Contract..." -ForegroundColor Cyan
$GUARDIAN_ID = soroban contract deploy `
    --wasm target/wasm32-unknown-unknown/release/sentinel_guardian.wasm `
    --source sentinel-deployer `
    --network testnet

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Guardian contract deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Guardian Contract: $GUARDIAN_ID" -ForegroundColor Green
Write-Host ""

# Deploy Gatekeeper Contract
Write-Host "Deploying Gatekeeper Contract..." -ForegroundColor Cyan
$GATEKEEPER_ID = soroban contract deploy `
    --wasm target/wasm32-unknown-unknown/release/sentinel_gatekeeper.wasm `
    --source sentinel-deployer `
    --network testnet

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Gatekeeper contract deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Gatekeeper Contract: $GATEKEEPER_ID" -ForegroundColor Green
Write-Host ""

# Save contract IDs
Write-Host "💾 Saving contract IDs..." -ForegroundColor Yellow

$envContent = @"
# Sentinel Smart Contract IDs (Testnet)
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

NEXT_PUBLIC_POLICY_CONTRACT_ID=$POLICY_ID
NEXT_PUBLIC_GUARDIAN_CONTRACT_ID=$GUARDIAN_ID
NEXT_PUBLIC_GATEKEEPER_CONTRACT_ID=$GATEKEEPER_ID

# Deployer Address
DEPLOYER_ADDRESS=$deployerAddress
"@

$envContent | Out-File -FilePath "..\contract-ids.env" -Encoding UTF8

Write-Host "✅ Contract IDs saved to ../contract-ids.env" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""
Write-Host "Contract IDs:" -ForegroundColor Cyan
Write-Host "  Policy:     $POLICY_ID" -ForegroundColor White
Write-Host "  Guardian:   $GUARDIAN_ID" -ForegroundColor White
Write-Host "  Gatekeeper: $GATEKEEPER_ID" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Add these contract IDs to your .env.local file" -ForegroundColor White
Write-Host "2. Initialize contracts with your account details" -ForegroundColor White
Write-Host "3. See QUICKSTART.md for initialization examples" -ForegroundColor White
Write-Host ""
Write-Host "To initialize contracts, run:" -ForegroundColor Cyan
Write-Host "  .\initialize.ps1 -YourAccount YOUR_STELLAR_ADDRESS" -ForegroundColor White
