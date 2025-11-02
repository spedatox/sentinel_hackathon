#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Bytes, BytesN, Env, Symbol, Vec};

#[derive(Clone)]
#[contracttype]
pub struct GuardianConfig {
    pub owner: Address,
    pub guardians: Vec<Address>,
    pub threshold: u32,
    pub timeout: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct PendingTx {
    pub id: BytesN<32>,
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub asset: Symbol,
    pub created_at: u64,
    pub approvals: Vec<Address>,
    pub executed: bool,
}

#[contracttype]
pub enum DataKey {
    Config(Address),
    PendingTx(BytesN<32>),
    TxCount(Address),
}

#[contract]
pub struct GuardianContract;

#[contractimpl]
impl GuardianContract {
    /// Initialize guardian configuration for an account
    pub fn init_guardian(
        env: Env,
        account: Address,
        owner: Address,
        guardians: Vec<Address>,
        threshold: u32,
        timeout: u64,
    ) {
        owner.require_auth();

        if threshold > guardians.len() {
            panic!("Threshold cannot exceed guardian count");
        }

        if threshold == 0 {
            panic!("Threshold must be at least 1");
        }

        let config = GuardianConfig {
            owner,
            guardians,
            threshold,
            timeout,
        };

        env.storage()
            .instance()
            .set(&DataKey::Config(account.clone()), &config);

        env.storage()
            .instance()
            .set(&DataKey::TxCount(account), &0u32);
    }

    /// Submit a high-risk transaction for guardian approval
    pub fn submit_tx(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
        asset: Symbol,
    ) -> BytesN<32> {
        from.require_auth();

        let config_key = DataKey::Config(from.clone());
        let config: GuardianConfig = env
            .storage()
            .instance()
            .get(&config_key)
            .expect("Guardian config not found");

        // Generate unique transaction ID
        let count_key = DataKey::TxCount(from.clone());
        let mut count: u32 = env.storage().instance().get(&count_key).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&count_key, &count);

        let mut data_to_hash = Bytes::new(&env);
        data_to_hash.append(&Bytes::from_slice(&env, &count.to_be_bytes()));
        data_to_hash.append(&Bytes::from_slice(&env, &amount.to_be_bytes()));
        let tx_id: BytesN<32> = env.crypto().sha256(&data_to_hash).into();

        let pending_tx = PendingTx {
            id: tx_id.clone(),
            from: from.clone(),
            to,
            amount,
            asset,
            created_at: env.ledger().timestamp(),
            approvals: Vec::new(&env),
            executed: false,
        };

        env.storage()
            .instance()
            .set(&DataKey::PendingTx(tx_id.clone()), &pending_tx);

        tx_id
    }

    /// Guardian approves a pending transaction
    pub fn approve_tx(env: Env, tx_id: BytesN<32>, guardian: Address) -> bool {
        guardian.require_auth();

        let tx_key = DataKey::PendingTx(tx_id.clone());
        let mut pending_tx: PendingTx = env
            .storage()
            .instance()
            .get(&tx_key)
            .expect("Transaction not found");

        if pending_tx.executed {
            panic!("Transaction already executed");
        }

        let config_key = DataKey::Config(pending_tx.from.clone());
        let config: GuardianConfig = env
            .storage()
            .instance()
            .get(&config_key)
            .expect("Guardian config not found");

        // Verify guardian is authorized
        let mut is_guardian = false;
        for g in config.guardians.iter() {
            if g == guardian {
                is_guardian = true;
                break;
            }
        }

        if !is_guardian {
            panic!("Not an authorized guardian");
        }

        // Check timeout
        let current_time = env.ledger().timestamp();
        if current_time - pending_tx.created_at > config.timeout {
            panic!("Transaction expired");
        }

        // Check if already approved by this guardian
        for approval in pending_tx.approvals.iter() {
            if approval == guardian {
                panic!("Already approved by this guardian");
            }
        }

        // Add approval
        pending_tx.approvals.push_back(guardian.clone());

        // Check if threshold reached
        let threshold_reached = pending_tx.approvals.len() >= config.threshold;

        if threshold_reached {
            pending_tx.executed = true;
        }

        env.storage().instance().set(&tx_key, &pending_tx);

        threshold_reached
    }

    /// Reject a pending transaction (owner only)
    pub fn reject_tx(env: Env, tx_id: BytesN<32>, owner: Address) {
        owner.require_auth();

        let tx_key = DataKey::PendingTx(tx_id.clone());
        let pending_tx: PendingTx = env
            .storage()
            .instance()
            .get(&tx_key)
            .expect("Transaction not found");

        let config_key = DataKey::Config(pending_tx.from.clone());
        let config: GuardianConfig = env
            .storage()
            .instance()
            .get(&config_key)
            .expect("Guardian config not found");

        if config.owner != owner {
            panic!("Only owner can reject");
        }

        env.storage().instance().remove(&tx_key);
    }

    /// Get pending transaction details
    pub fn get_tx(env: Env, tx_id: BytesN<32>) -> Option<PendingTx> {
        env.storage()
            .instance()
            .get(&DataKey::PendingTx(tx_id))
    }

    /// Update guardian configuration
    pub fn update_guardians(
        env: Env,
        account: Address,
        owner: Address,
        guardians: Vec<Address>,
        threshold: u32,
    ) {
        owner.require_auth();

        let config_key = DataKey::Config(account.clone());
        let mut config: GuardianConfig = env
            .storage()
            .instance()
            .get(&config_key)
            .expect("Guardian config not found");

        if config.owner != owner {
            panic!("Unauthorized");
        }

        if threshold > guardians.len() {
            panic!("Threshold cannot exceed guardian count");
        }

        config.guardians = guardians;
        config.threshold = threshold;

        env.storage().instance().set(&config_key, &config);
    }

    /// Get guardian configuration
    pub fn get_config(env: Env, account: Address) -> Option<GuardianConfig> {
        env.storage()
            .instance()
            .get(&DataKey::Config(account))
    }

    /// Check if transaction is approved and ready to execute
    pub fn is_approved(env: Env, tx_id: BytesN<32>) -> bool {
        let tx_key = DataKey::PendingTx(tx_id);
        let pending_tx: Option<PendingTx> = env.storage().instance().get(&tx_key);

        match pending_tx {
            Some(tx) => tx.executed,
            None => false,
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, BytesN as _};
    use soroban_sdk::{symbol_short, Env};

    #[test]
    fn test_guardian_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, GuardianContract);
        let client = GuardianContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let account = Address::generate(&env);
        let guardian1 = Address::generate(&env);
        let guardian2 = Address::generate(&env);
        let recipient = Address::generate(&env);

        let mut guardians = Vec::new(&env);
        guardians.push_back(guardian1.clone());
        guardians.push_back(guardian2.clone());

        // Initialize with 2 guardians, threshold of 2
        client.init_guardian(&account, &owner, &guardians, &2, &3600);

        // Submit transaction
        let tx_id = client.submit_tx(&account, &recipient, &1000_0000000, &symbol_short!("XLM"));

        // First guardian approves
        let ready = client.approve_tx(&tx_id, &guardian1);
        assert!(!ready); // Not ready yet (need 2)

        // Second guardian approves
        let ready = client.approve_tx(&tx_id, &guardian2);
        assert!(ready); // Now ready

        // Verify transaction is marked as executed
        assert!(client.is_approved(&tx_id));
    }

    #[test]
    #[should_panic(expected = "Not an authorized guardian")]
    fn test_unauthorized_guardian() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, GuardianContract);
        let client = GuardianContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let account = Address::generate(&env);
        let guardian = Address::generate(&env);
        let fake_guardian = Address::generate(&env);
        let recipient = Address::generate(&env);

        let mut guardians = Vec::new(&env);
        guardians.push_back(guardian);

        client.init_guardian(&account, &owner, &guardians, &1, &3600);

        let tx_id = client.submit_tx(&account, &recipient, &1000_0000000, &symbol_short!("XLM"));

        // This should panic - fake_guardian is not authorized
        client.approve_tx(&tx_id, &fake_guardian);
    }
}
