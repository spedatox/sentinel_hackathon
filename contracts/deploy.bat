@echo off
echo ====================================
echo Sentinel Contracts Deployment Setup
echo ====================================
echo.

REM Refresh environment variables
call refreshenv 2>nul

REM Add Rust to PATH
set PATH=%USERPROFILE%\.cargo\bin;%PATH%

echo Step 1: Checking Rust installation...
rustc --version
if %errorlevel% neq 0 (
    echo ERROR: Rust not found in PATH
    echo Please close this window and open a NEW PowerShell/CMD window
    echo Then run: cargo --version
    pause
    exit /b 1
)

echo.
echo Step 2: Adding WebAssembly target...
rustup target add wasm32-unknown-unknown

echo.
echo Step 3: Installing Stellar CLI...
cargo install --locked stellar-cli

echo.
echo Step 4: Building contracts...
cd /d "%~dp0"
cargo build --release --target wasm32-unknown-unknown

echo.
echo Step 5: Setting up deployer identity...
soroban keys generate sentinel-deployer --network testnet
soroban keys fund sentinel-deployer --network testnet

echo.
echo Step 6: Deploying Policy Contract...
for /f "delims=" %%i in ('soroban contract deploy --wasm target\wasm32-unknown-unknown\release\sentinel_policy.wasm --source sentinel-deployer --network testnet') do set POLICY_ID=%%i
echo Policy Contract: %POLICY_ID%

echo.
echo Step 7: Deploying Guardian Contract...
for /f "delims=" %%i in ('soroban contract deploy --wasm target\wasm32-unknown-unknown\release\sentinel_guardian.wasm --source sentinel-deployer --network testnet') do set GUARDIAN_ID=%%i
echo Guardian Contract: %GUARDIAN_ID%

echo.
echo Step 8: Deploying Gatekeeper Contract...
for /f "delims=" %%i in ('soroban contract deploy --wasm target\wasm32-unknown-unknown\release\sentinel_gatekeeper.wasm --source sentinel-deployer --network testnet') do set GATEKEEPER_ID=%%i
echo Gatekeeper Contract: %GATEKEEPER_ID%

echo.
echo ====================================
echo Deployment Complete!
echo ====================================
echo.
echo Contract IDs:
echo   Policy:     %POLICY_ID%
echo   Guardian:   %GUARDIAN_ID%
echo   Gatekeeper: %GATEKEEPER_ID%
echo.
echo These IDs have been saved to contract-ids.env
echo.

REM Save to file
(
echo # Sentinel Contract IDs - Testnet
echo NEXT_PUBLIC_POLICY_CONTRACT_ID=%POLICY_ID%
echo NEXT_PUBLIC_GUARDIAN_CONTRACT_ID=%GUARDIAN_ID%
echo NEXT_PUBLIC_GATEKEEPER_CONTRACT_ID=%GATEKEEPER_ID%
) > ..\contract-ids.env

echo Next: Run initialize.bat with your Stellar account address
pause
