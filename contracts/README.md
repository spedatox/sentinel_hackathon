# Sentinel Smart Contracts

Three Soroban smart contracts for on-chain behavioral security enforcement on Stellar.

## Contracts

### 1. **Policy Contract** (`policy/`)
Enforces spending limits and transaction rules per account.

**Features:**
- Daily spending limits
- Per-transaction limits
- Cooling periods between transactions
- Account blocking/unblocking
- Recipient allowlists
- Automatic daily usage reset

**Key Functions:**
```rust
init_policy(account, owner, daily_limit, tx_limit, cooling_period)
check_tx(account, amount) -> bool
record_tx(account, amount)
update_policy(account, daily_limit, tx_limit, cooling_period)
block_account(account, owner)
add_to_allowlist(account, recipient, owner)
is_allowlisted(account, recipient) -> bool
```

**Use Case:**
Set a 1000 XLM daily limit and 500 XLM per-transaction limit. Allowlist trusted recipients to bypass checks.

---

### 2. **Guardian Contract** (`guardian/`)
Multi-signature approval system for high-risk transactions.

**Features:**
- Configurable guardian threshold (M-of-N)
- Time-bound pending transactions
- Sequential approval tracking
- Transaction expiry/rejection
- Owner-controlled guardian updates

**Key Functions:**
```rust
init_guardian(account, owner, guardians, threshold, timeout)
submit_tx(from, to, amount, asset) -> tx_id
approve_tx(tx_id, guardian) -> bool
reject_tx(tx_id, owner)
is_approved(tx_id) -> bool
update_guardians(account, owner, guardians, threshold)
```

**Use Case:**
Require 2-of-3 guardian signatures for transactions exceeding risk threshold. Transactions expire after 1 hour if not approved.

---

### 3. **Gatekeeper Contract** (`gatekeeper/`)
Risk-based transaction gating with adaptive controls.

**Features:**
- Three-tier risk levels (Low/Medium/High)
- Cooldown enforcement for medium risk
- Guardian requirement for high risk
- Trusted recipient bypass
- Permanent recipient blocking
- Transaction history tracking (last 100)

**Key Functions:**
```rust
init_gatekeeper(account, owner, medium_requires_cooldown, high_requires_guardian, cooldown_seconds)
gate_tx(account, recipient, amount, risk_level) -> bool
record_score(account, recipient, amount, risk_level)
trust_recipient(account, recipient, owner)
block_recipient(account, recipient, owner)
set_enabled(account, owner, enabled)
```

**Use Case:**
Low-risk passes immediately. Medium-risk requires 60-second cooldown. High-risk requires guardian approval (or 3x cooldown if guardian disabled).

---

## Building

Prerequisites:
- Rust 1.79.0+
- `soroban-cli` installed ([Installation guide](https://soroban.stellar.org/docs/getting-started/setup))

```bash
cd contracts

# Build all contracts
cargo build --release --target wasm32-unknown-unknown

# Optimize WASM
soroban contract optimize \
  --wasm target/wasm32-unknown-unknown/release/sentinel_policy.wasm \
  --wasm-out target/wasm32-unknown-unknown/release/sentinel_policy_optimized.wasm

soroban contract optimize \
  --wasm target/wasm32-unknown-unknown/release/sentinel_guardian.wasm \
  --wasm-out target/wasm32-unknown-unknown/release/sentinel_guardian_optimized.wasm

soroban contract optimize \
  --wasm target/wasm32-unknown-unknown/release/sentinel_gatekeeper.wasm \
  --wasm-out target/wasm32-unknown-unknown/release/sentinel_gatekeeper_optimized.wasm
```

---

## Testing

```bash
# Run all tests
cargo test

# Run tests for specific contract
cargo test -p sentinel-policy
cargo test -p sentinel-guardian
cargo test -p sentinel-gatekeeper

# Run with output
cargo test -- --nocapture
```

---

## Deployment (Testnet)

### 1. Setup Stellar CLI Identity

```bash
# Create or import identity
soroban keys generate sentinel-deployer --network testnet

# Fund account via Friendbot
soroban keys fund sentinel-deployer --network testnet
```

### 2. Deploy Contracts

```bash
# Deploy Policy Contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/sentinel_policy_optimized.wasm \
  --source sentinel-deployer \
  --network testnet

# Copy output contract ID
export POLICY_ID=<CONTRACT_ID>

# Deploy Guardian Contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/sentinel_guardian_optimized.wasm \
  --source sentinel-deployer \
  --network testnet

export GUARDIAN_ID=<CONTRACT_ID>

# Deploy Gatekeeper Contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/sentinel_gatekeeper_optimized.wasm \
  --source sentinel-deployer \
  --network testnet

export GATEKEEPER_ID=<CONTRACT_ID>
```

### 3. Initialize Contracts

```bash
# Initialize Policy (1000 XLM daily, 500 XLM per tx, 60s cooldown)
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

# Initialize Guardian (2-of-3, 1 hour timeout)
soroban contract invoke \
  --id $GUARDIAN_ID \
  --source sentinel-deployer \
  --network testnet \
  -- init_guardian \
  --account <YOUR_ACCOUNT> \
  --owner <YOUR_ACCOUNT> \
  --guardians '["<GUARDIAN1>", "<GUARDIAN2>", "<GUARDIAN3>"]' \
  --threshold 2 \
  --timeout 3600

# Initialize Gatekeeper (60s cooldown, guardian required)
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

---

## Integration with Sentinel App

Update `src/lib/contract.ts` in the Next.js app:

```typescript
import * as StellarSdk from '@stellar/stellar-sdk';

export const POLICY_CONTRACT_ID = process.env.NEXT_PUBLIC_POLICY_CONTRACT_ID!;
export const GUARDIAN_CONTRACT_ID = process.env.NEXT_PUBLIC_GUARDIAN_CONTRACT_ID!;
export const GATEKEEPER_CONTRACT_ID = process.env.NEXT_PUBLIC_GATEKEEPER_CONTRACT_ID!;

export async function checkPolicyLimit(
  account: string,
  amount: number
): Promise<boolean> {
  const server = new StellarSdk.SorobanRpc.Server(
    process.env.NEXT_PUBLIC_HORIZON_URL!
  );

  const contract = new StellarSdk.Contract(POLICY_CONTRACT_ID);
  const operation = contract.call(
    'check_tx',
    StellarSdk.nativeToScVal(account, { type: 'address' }),
    StellarSdk.nativeToScVal(amount, { type: 'i128' })
  );

  const tx = new StellarSdk.TransactionBuilder(
    await server.getAccount(account),
    {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    }
  )
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const result = await server.simulateTransaction(tx);
  return StellarSdk.scValToNative(result.result!.retval);
}

export async function submitForGuardianApproval(
  from: string,
  to: string,
  amount: number,
  asset: string
): Promise<string> {
  // Returns transaction ID for guardian approval
  // Implementation similar to checkPolicyLimit
}

export async function gateTransaction(
  account: string,
  recipient: string,
  amount: number,
  riskLevel: 'Low' | 'Medium' | 'High'
): Promise<boolean> {
  // Check if transaction passes gatekeeper rules
}
```

Add contract IDs to `.env.local`:

```bash
NEXT_PUBLIC_POLICY_CONTRACT_ID=CA...
NEXT_PUBLIC_GUARDIAN_CONTRACT_ID=CB...
NEXT_PUBLIC_GATEKEEPER_CONTRACT_ID=CC...
```

---

## Architecture Flow

```
User initiates payment
       ↓
[PaymentForm] calculates risk score
       ↓
   ┌──────────────────┐
   │ Risk Score < 0.3 │ → [LOW] → Gatekeeper.gate_tx() → Policy.check_tx() → Submit
   │    (Low Risk)    │
   └──────────────────┘
       ↓
   ┌──────────────────┐
   │ Risk Score < 0.6 │ → [MEDIUM] → Step-up auth → Gatekeeper cooldown → Policy → Submit
   │  (Medium Risk)   │
   └──────────────────┘
       ↓
   ┌──────────────────┐
   │ Risk Score ≥ 0.6 │ → [HIGH] → Guardian.submit_tx() → Wait for approvals → Submit
   │   (High Risk)    │
   └──────────────────┘
```

---

## Gas Costs (Approximate)

| Operation | Testnet Stroops | Mainnet Stroops |
|-----------|-----------------|-----------------|
| init_policy | ~500,000 | ~500,000 |
| check_tx | ~50,000 | ~50,000 |
| submit_tx (Guardian) | ~100,000 | ~100,000 |
| approve_tx | ~80,000 | ~80,000 |
| gate_tx | ~60,000 | ~60,000 |

---

## Security Considerations

1. **Owner Keys**: Store owner private keys securely (hardware wallet recommended for mainnet).
2. **Guardian Selection**: Choose independent, trusted guardians with separate key management.
3. **Timeout Configuration**: Balance security (longer timeout) vs. UX (shorter timeout).
4. **Allowlist Hygiene**: Regularly audit trusted recipients.
5. **Contract Upgrades**: Current contracts are immutable. Plan upgrade strategy using proxy patterns.

---

## Troubleshooting

**Contract deployment fails:**
```bash
# Check account is funded
soroban keys address sentinel-deployer
# Visit https://laboratory.stellar.org/account/friendbot to fund
```

**Transaction simulation fails:**
```bash
# Verify contract ID
soroban contract id wasm --wasm <path-to-wasm>

# Check network connectivity
soroban config network
```

**Invoke returns error:**
```bash
# Check if contract initialized
soroban contract invoke --id $POLICY_ID --network testnet -- get_policy --account <ADDR>

# Verify account has authorization
# Ensure --source matches owner in init functions
```

---

## Roadmap

- [ ] Add oracle integration for real-time risk scoring on-chain
- [ ] Implement emergency freeze mechanism (pause all transactions)
- [ ] Support custom token assets beyond XLM
- [ ] Add batch approval for guardians
- [ ] Create upgradeable proxy pattern
- [ ] Build governance module for decentralized policy updates
- [ ] Integrate with Stellar anchors for fiat on/off ramps with automatic compliance checks

---

## Resources

- [Soroban Documentation](https://soroban.stellar.org/docs)
- [Stellar CLI Guide](https://soroban.stellar.org/docs/getting-started/setup)
- [Smart Contract Examples](https://github.com/stellar/soroban-examples)
- [Sentinel App Repository](../README.md)

Built for Stellar hackathons. Smart contracts meet behavioral AI.
