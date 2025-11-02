#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Vec};

#[derive(Clone, Copy, PartialEq)]
#[contracttype]
#[repr(u32)]
pub enum RiskLevel {
    Low = 0,
    Medium = 1,
    High = 2,
}

#[derive(Clone)]
#[contracttype]
pub struct GatekeeperConfig {
    pub owner: Address,
    pub enabled: bool,
    pub medium_requires_cooldown: bool,
    pub high_requires_guardian: bool,
    pub cooldown_seconds: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct TransactionScore {
    pub account: Address,
    pub recipient: Address,
    pub amount: i128,
    pub risk_level: RiskLevel,
    pub timestamp: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct Cooldown {
    pub last_tx: u64,
    pub attempts: u32,
}

#[contracttype]
pub enum DataKey {
    Config(Address),
    TrustedRecipients(Address),
    Cooldown(Address),
    TxHistory(Address),
    BlockedRecipients(Address),
}

#[contract]
pub struct GatekeeperContract;

#[contractimpl]
impl GatekeeperContract {
    /// Initialize gatekeeper for an account
    pub fn init_gatekeeper(
        env: Env,
        account: Address,
        owner: Address,
        medium_requires_cooldown: bool,
        high_requires_guardian: bool,
        cooldown_seconds: u64,
    ) {
        owner.require_auth();

        let config = GatekeeperConfig {
            owner,
            enabled: true,
            medium_requires_cooldown,
            high_requires_guardian,
            cooldown_seconds,
        };

        env.storage()
            .instance()
            .set(&DataKey::Config(account.clone()), &config);

        let trusted: Vec<Address> = Vec::new(&env);
        env.storage()
            .instance()
            .set(&DataKey::TrustedRecipients(account.clone()), &trusted);

        let history: Vec<TransactionScore> = Vec::new(&env);
        env.storage()
            .instance()
            .set(&DataKey::TxHistory(account), &history);
    }

    /// Gate a transaction based on risk score
    pub fn gate_tx(
        env: Env,
        account: Address,
        recipient: Address,
        _amount: i128,
        risk_level: RiskLevel,
    ) -> bool {
        let config_key = DataKey::Config(account.clone());
        let config: Option<GatekeeperConfig> = env.storage().instance().get(&config_key);

        if config.is_none() {
            return true; // No config = allow
        }

        let config = config.unwrap();

        if !config.enabled {
            return true;
        }

        // Check if recipient is blocked
        let blocked_key = DataKey::BlockedRecipients(account.clone());
        let blocked: Vec<Address> = env
            .storage()
            .instance()
            .get(&blocked_key)
            .unwrap_or(Vec::new(&env));

        for addr in blocked.iter() {
            if addr == recipient {
                return false; // Blocked recipient
            }
        }

        // Check if recipient is trusted (bypass all checks)
        let trusted_key = DataKey::TrustedRecipients(account.clone());
        let trusted: Vec<Address> = env
            .storage()
            .instance()
            .get(&trusted_key)
            .unwrap_or(Vec::new(&env));

        for addr in trusted.iter() {
            if addr == recipient {
                return true; // Trusted recipient
            }
        }

        let current_time = env.ledger().timestamp();

        match risk_level {
            RiskLevel::Low => true,
            RiskLevel::Medium => {
                if !config.medium_requires_cooldown {
                    return true;
                }

                // Check cooldown
                let cooldown_key = DataKey::Cooldown(account.clone());
                let cooldown: Option<Cooldown> = env.storage().instance().get(&cooldown_key);

                match cooldown {
                    Some(cd) => {
                        let elapsed = current_time - cd.last_tx;
                        if elapsed < config.cooldown_seconds {
                            return false; // Still in cooldown
                        }
                    }
                    None => {}
                }

                // Update cooldown
                let new_cooldown = Cooldown {
                    last_tx: current_time,
                    attempts: 1,
                };
                env.storage()
                    .instance()
                    .set(&cooldown_key, &new_cooldown);

                true
            }
            RiskLevel::High => {
                if config.high_requires_guardian {
                    return false; // Must go through guardian approval
                }

                // Even if guardian not required, enforce stricter cooldown
                let cooldown_key = DataKey::Cooldown(account.clone());
                let cooldown: Option<Cooldown> = env.storage().instance().get(&cooldown_key);

                match cooldown {
                    Some(cd) => {
                        let elapsed = current_time - cd.last_tx;
                        let extended_cooldown = config.cooldown_seconds * 3;
                        if elapsed < extended_cooldown {
                            return false;
                        }
                    }
                    None => {}
                }

                true
            }
        }
    }

    /// Record transaction for future risk analysis
    pub fn record_score(
        env: Env,
        account: Address,
        recipient: Address,
        amount: i128,
        risk_level: RiskLevel,
    ) {
        let history_key = DataKey::TxHistory(account.clone());
        let mut history: Vec<TransactionScore> = env
            .storage()
            .instance()
            .get(&history_key)
            .unwrap_or(Vec::new(&env));

        let score = TransactionScore {
            account: account.clone(),
            recipient,
            amount,
            risk_level,
            timestamp: env.ledger().timestamp(),
        };

        history.push_back(score);

        // Keep only last 100 transactions
        if history.len() > 100 {
            history.remove(0);
        }

        env.storage().instance().set(&history_key, &history);
    }

    /// Add recipient to trusted list
    pub fn trust_recipient(env: Env, account: Address, recipient: Address, owner: Address) {
        owner.require_auth();

        let config_key = DataKey::Config(account.clone());
        let config: GatekeeperConfig = env
            .storage()
            .instance()
            .get(&config_key)
            .expect("Config not found");

        if config.owner != owner {
            panic!("Unauthorized");
        }

        let trusted_key = DataKey::TrustedRecipients(account.clone());
        let mut trusted: Vec<Address> = env
            .storage()
            .instance()
            .get(&trusted_key)
            .unwrap_or(Vec::new(&env));

        // Check if already trusted
        for addr in trusted.iter() {
            if addr == recipient {
                return; // Already trusted
            }
        }

        trusted.push_back(recipient);
        env.storage().instance().set(&trusted_key, &trusted);
    }

    /// Remove recipient from trusted list
    pub fn untrust_recipient(env: Env, account: Address, recipient: Address, owner: Address) {
        owner.require_auth();

        let config_key = DataKey::Config(account.clone());
        let config: GatekeeperConfig = env
            .storage()
            .instance()
            .get(&config_key)
            .expect("Config not found");

        if config.owner != owner {
            panic!("Unauthorized");
        }

        let trusted_key = DataKey::TrustedRecipients(account.clone());
        let trusted: Vec<Address> = env
            .storage()
            .instance()
            .get(&trusted_key)
            .unwrap_or(Vec::new(&env));

        let mut new_trusted = Vec::new(&env);
        for addr in trusted.iter() {
            if addr != recipient {
                new_trusted.push_back(addr);
            }
        }

        env.storage().instance().set(&trusted_key, &new_trusted);
    }

    /// Block a recipient permanently
    pub fn block_recipient(env: Env, account: Address, recipient: Address, owner: Address) {
        owner.require_auth();

        let config_key = DataKey::Config(account.clone());
        let config: GatekeeperConfig = env
            .storage()
            .instance()
            .get(&config_key)
            .expect("Config not found");

        if config.owner != owner {
            panic!("Unauthorized");
        }

        let blocked_key = DataKey::BlockedRecipients(account.clone());
        let mut blocked: Vec<Address> = env
            .storage()
            .instance()
            .get(&blocked_key)
            .unwrap_or(Vec::new(&env));

        blocked.push_back(recipient);
        env.storage().instance().set(&blocked_key, &blocked);
    }

    /// Enable or disable gatekeeper
    pub fn set_enabled(env: Env, account: Address, owner: Address, enabled: bool) {
        owner.require_auth();

        let config_key = DataKey::Config(account.clone());
        let mut config: GatekeeperConfig = env
            .storage()
            .instance()
            .get(&config_key)
            .expect("Config not found");

        if config.owner != owner {
            panic!("Unauthorized");
        }

        config.enabled = enabled;
        env.storage().instance().set(&config_key, &config);
    }

    /// Get transaction history
    pub fn get_history(env: Env, account: Address) -> Vec<TransactionScore> {
        let history_key = DataKey::TxHistory(account);
        env.storage()
            .instance()
            .get(&history_key)
            .unwrap_or(Vec::new(&env))
    }

    /// Get trusted recipients
    pub fn get_trusted(env: Env, account: Address) -> Vec<Address> {
        let trusted_key = DataKey::TrustedRecipients(account);
        env.storage()
            .instance()
            .get(&trusted_key)
            .unwrap_or(Vec::new(&env))
    }

    /// Get configuration
    pub fn get_config(env: Env, account: Address) -> Option<GatekeeperConfig> {
        env.storage()
            .instance()
            .get(&DataKey::Config(account))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::Env;

    #[test]
    fn test_risk_gating() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, GatekeeperContract);
        let client = GatekeeperContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let account = Address::generate(&env);
        let recipient = Address::generate(&env);

        // Initialize with cooldown enabled
        client.init_gatekeeper(&account, &owner, &true, &true, &60);

        // Low risk - should pass
        assert!(client.gate_tx(&account, &recipient, &100_0000000, &RiskLevel::Low));

        // Medium risk - should pass once
        assert!(client.gate_tx(&account, &recipient, &500_0000000, &RiskLevel::Medium));

        // Medium risk again immediately - should fail (cooldown)
        assert!(!client.gate_tx(&account, &recipient, &500_0000000, &RiskLevel::Medium));

        // High risk - should fail (guardian required)
        assert!(!client.gate_tx(&account, &recipient, &2000_0000000, &RiskLevel::High));
    }

    #[test]
    fn test_trusted_recipients() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, GatekeeperContract);
        let client = GatekeeperContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let account = Address::generate(&env);
        let recipient = Address::generate(&env);

        client.init_gatekeeper(&account, &owner, &true, &true, &60);

        // Trust recipient
        client.trust_recipient(&account, &recipient, &owner);

        // High risk to trusted recipient - should pass
        assert!(client.gate_tx(&account, &recipient, &2000_0000000, &RiskLevel::High));

        // Verify trusted list
        let trusted = client.get_trusted(&account);
        assert_eq!(trusted.len(), 1);
    }
}
