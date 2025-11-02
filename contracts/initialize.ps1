# Sentinel Smart Contracts Initialization Script
# This script initializes the deployed contracts with your account

param(
    [Parameter(Mandatory=$true)]
    [string]$YourAccount
)

Write-Host "🔧 Initializing Sentinel Contracts" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Load contract IDs
if (!(Test-Path "contract-ids.env")) {
    Write-Host "❌ contract-ids.env not found. Please deploy contracts first." -ForegroundColor Red
    exit 1
}

$envContent = Get-Content "contract-ids.env"
$POLICY_ID = ($envContent | Select-String "NEXT_PUBLIC_POLICY_CONTRACT_ID=(.+)").Matches.Groups[1].Value
$GUARDIAN_ID = ($envContent | Select-String "NEXT_PUBLIC_GUARDIAN_CONTRACT_ID=(.+)").Matches.Groups[1].Value
$GATEKEEPER_ID = ($envContent | Select-String "NEXT_PUBLIC_GATEKEEPER_CONTRACT_ID=(.+)").Matches.Groups[1].Value

Write-Host "Contract IDs loaded:" -ForegroundColor Green
Write-Host "  Policy: $POLICY_ID" -ForegroundColor White
Write-Host "  Guardian: $GUARDIAN_ID" -ForegroundColor White
Write-Host "  Gatekeeper: $GATEKEEPER_ID" -ForegroundColor White
Write-Host ""

# Initialize Policy Contract
Write-Host "📋 Initializing Policy Contract..." -ForegroundColor Yellow
Write-Host "  Daily limit: 100 XLM" -ForegroundColor Cyan
Write-Host "  Per-tx limit: 50 XLM" -ForegroundColor Cyan
Write-Host "  Cooling period: 60 seconds" -ForegroundColor Cyan

soroban contract invoke `
    --id $POLICY_ID `
    --source sentinel-deployer `
    --network testnet `
    -- init_policy `
    --account $YourAccount `
    --owner $YourAccount `
    --daily_limit 1000000000 `
    --tx_limit 500000000 `
    --cooling_period 60

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Policy Contract initialized" -ForegroundColor Green
} else {
    Write-Host "❌ Policy initialization failed" -ForegroundColor Red
}
Write-Host ""

# Initialize Guardian Contract
Write-Host "🛡️ Initializing Guardian Contract..." -ForegroundColor Yellow
Write-Host "  Threshold: 2-of-3 signatures" -ForegroundColor Cyan
Write-Host "  Timeout: 3600 seconds (1 hour)" -ForegroundColor Cyan

# You'll need to provide guardian addresses
Write-Host "⚠️  Note: Using placeholder guardian addresses. Update these!" -ForegroundColor Yellow
$guardian1 = "GCZJTJHCNR5HZFAYPJD7XNMWN6UQBXVXFMQAQJ4NRQXB3WQJZQXLB3W4"
$guardian2 = "GDIJPZVQB5FQJDVZKGPX3QNZJVNLBXQFWMQAQJ4NRQXB3WQJZQXLB3W4"
$guardian3 = "GDZXJPZVQB5FQJDVZKGPX3QNZJVNLBXQFWMQAQJ4NRQXB3WQJZQXLB3W5"

soroban contract invoke `
    --id $GUARDIAN_ID `
    --source sentinel-deployer `
    --network testnet `
    -- init_guardian `
    --account $YourAccount `
    --owner $YourAccount `
    --guardians "[""$guardian1"", ""$guardian2"", ""$guardian3""]" `
    --threshold 2 `
    --timeout 3600

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Guardian Contract initialized" -ForegroundColor Green
} else {
    Write-Host "⚠️  Guardian initialization may need manual setup" -ForegroundColor Yellow
}
Write-Host ""

# Initialize Gatekeeper Contract
Write-Host "🚪 Initializing Gatekeeper Contract..." -ForegroundColor Yellow
Write-Host "  Medium risk: requires cooldown" -ForegroundColor Cyan
Write-Host "  High risk: requires guardian" -ForegroundColor Cyan
Write-Host "  Cooldown: 60 seconds" -ForegroundColor Cyan

soroban contract invoke `
    --id $GATEKEEPER_ID `
    --source sentinel-deployer `
    --network testnet `
    -- init_gatekeeper `
    --account $YourAccount `
    --owner $YourAccount `
    --medium_requires_cooldown true `
    --high_requires_guardian true `
    --cooldown_seconds 60

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Gatekeeper Contract initialized" -ForegroundColor Green
} else {
    Write-Host "❌ Gatekeeper initialization failed" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "🎉 Initialization Complete!" -ForegroundColor Green
Write-Host "==========================" -ForegroundColor Green
Write-Host ""
Write-Host "Your account: $YourAccount" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update guardian addresses in the Guardian contract" -ForegroundColor White
Write-Host "2. Test the contracts with sample transactions" -ForegroundColor White
Write-Host "3. Configure your frontend with these contract IDs" -ForegroundColor White
