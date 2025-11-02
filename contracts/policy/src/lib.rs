#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Vec};

#[derive(Clone)]
#[contracttype]
pub struct Policy {
    pub owner: Address,
    pub daily_limit: i128,
    pub tx_limit: i128,
    pub cooling_period: u64,
    pub enabled: bool,
}

#[derive(Clone)]
#[contracttype]
pub struct DailyUsage {
    pub amount: i128,
    pub last_reset: u64,
}

#[contracttype]
pub enum DataKey {
    Policy(Address),
    Usage(Address),
    Blocked(Address),
    Allowlist(Address),
}

#[contract]
pub struct PolicyContract;

#[contractimpl]
impl PolicyContract {
    /// Initialize a spending policy for an account
    pub fn init_policy(
        env: Env,
        account: Address,
        owner: Address,
        daily_limit: i128,
        tx_limit: i128,
        cooling_period: u64,
    ) {
        owner.require_auth();

        let policy = Policy {
            owner: owner.clone(),
            daily_limit,
            tx_limit,
            cooling_period,
            enabled: true,
        };

        env.storage()
            .instance()
            .set(&DataKey::Policy(account.clone()), &policy);

        let usage = DailyUsage {
            amount: 0,
            last_reset: env.ledger().timestamp(),
        };

        env.storage()
            .instance()
            .set(&DataKey::Usage(account), &usage);
    }

    /// Check if a transaction is allowed under the policy
    pub fn check_tx(env: Env, account: Address, amount: i128) -> bool {
        let policy_key = DataKey::Policy(account.clone());
        let policy: Option<Policy> = env.storage().instance().get(&policy_key);

        if policy.is_none() {
            return true; // No policy = allow
        }

        let policy = policy.unwrap();

        if !policy.enabled {
            return false;
        }

        // Check if account is blocked
        let blocked_key = DataKey::Blocked(account.clone());
        let is_blocked: bool = env.storage().instance().get(&blocked_key).unwrap_or(false);
        if is_blocked {
            return false;
        }

        // Check transaction limit
        if amount > policy.tx_limit {
            return false;
        }

        // Check daily limit
        let usage_key = DataKey::Usage(account.clone());
        let mut usage: DailyUsage = env
            .storage()
            .instance()
            .get(&usage_key)
            .unwrap_or(DailyUsage {
                amount: 0,
                last_reset: env.ledger().timestamp(),
            });

        let current_time = env.ledger().timestamp();
        let one_day = 86400u64;

        // Reset daily usage if 24 hours have passed
        if current_time - usage.last_reset >= one_day {
            usage.amount = 0;
            usage.last_reset = current_time;
        }

        // Check if adding this amount would exceed daily limit
        if usage.amount + amount > policy.daily_limit {
            return false;
        }

        // Update usage
        usage.amount += amount;
        env.storage().instance().set(&usage_key, &usage);

        true
    }

    /// Record a transaction (called after check_tx passes)
    pub fn record_tx(env: Env, account: Address, amount: i128) {
        let usage_key = DataKey::Usage(account.clone());
        let mut usage: DailyUsage = env
            .storage()
            .instance()
            .get(&usage_key)
            .unwrap_or(DailyUsage {
                amount: 0,
                last_reset: env.ledger().timestamp(),
            });

        let current_time = env.ledger().timestamp();
        let one_day = 86400u64;

        if current_time - usage.last_reset >= one_day {
            usage.amount = amount;
            usage.last_reset = current_time;
        } else {
            usage.amount += amount;
        }

        env.storage().instance().set(&usage_key, &usage);
    }

    /// Update policy settings
    pub fn update_policy(
        env: Env,
        account: Address,
        daily_limit: i128,
        tx_limit: i128,
        cooling_period: u64,
    ) {
        let policy_key = DataKey::Policy(account.clone());
        let mut policy: Policy = env
            .storage()
            .instance()
            .get(&policy_key)
            .expect("Policy not found");

        policy.owner.require_auth();

        policy.daily_limit = daily_limit;
        policy.tx_limit = tx_limit;
        policy.cooling_period = cooling_period;

        env.storage().instance().set(&policy_key, &policy);
    }

    /// Block an account temporarily
    pub fn block_account(env: Env, account: Address, owner: Address) {
        owner.require_auth();

        let policy_key = DataKey::Policy(account.clone());
        let policy: Policy = env
            .storage()
            .instance()
            .get(&policy_key)
            .expect("Policy not found");

        if policy.owner != owner {
            panic!("Unauthorized");
        }

        env.storage()
            .instance()
            .set(&DataKey::Blocked(account), &true);
    }

    /// Unblock an account
    pub fn unblock_account(env: Env, account: Address, owner: Address) {
        owner.require_auth();

        let policy_key = DataKey::Policy(account.clone());
        let policy: Policy = env
            .storage()
            .instance()
            .get(&policy_key)
            .expect("Policy not found");

        if policy.owner != owner {
            panic!("Unauthorized");
        }

        env.storage()
            .instance()
            .set(&DataKey::Blocked(account), &false);
    }

    /// Add address to allowlist (bypasses limits)
    pub fn add_to_allowlist(env: Env, account: Address, recipient: Address, owner: Address) {
        owner.require_auth();

        let policy_key = DataKey::Policy(account.clone());
        let policy: Policy = env
            .storage()
            .instance()
            .get(&policy_key)
            .expect("Policy not found");

        if policy.owner != owner {
            panic!("Unauthorized");
        }

        let allowlist_key = DataKey::Allowlist(account.clone());
        let mut allowlist: Vec<Address> = env
            .storage()
            .instance()
            .get(&allowlist_key)
            .unwrap_or(Vec::new(&env));

        allowlist.push_back(recipient);
        env.storage().instance().set(&allowlist_key, &allowlist);
    }

    /// Check if recipient is allowlisted
    pub fn is_allowlisted(env: Env, account: Address, recipient: Address) -> bool {
        let allowlist_key = DataKey::Allowlist(account);
        let allowlist: Vec<Address> = env
            .storage()
            .instance()
            .get(&allowlist_key)
            .unwrap_or(Vec::new(&env));

        for addr in allowlist.iter() {
            if addr == recipient {
                return true;
            }
        }
        false
    }

    /// Get current policy
    pub fn get_policy(env: Env, account: Address) -> Option<Policy> {
        env.storage()
            .instance()
            .get(&DataKey::Policy(account))
    }

    /// Get daily usage
    pub fn get_usage(env: Env, account: Address) -> Option<DailyUsage> {
        env.storage().instance().get(&DataKey::Usage(account))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::Env;

    #[test]
    fn test_init_and_check() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, PolicyContract);
        let client = PolicyContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let account = Address::generate(&env);

        // Initialize policy: 1000 XLM daily, 500 XLM per tx
        client.init_policy(&account, &owner, &1_000_0000000, &500_0000000, &3600);

        // Check small transaction - should pass
        assert!(client.check_tx(&account, &100_0000000));

        // Check large transaction exceeding tx limit - should fail
        assert!(!client.check_tx(&account, &600_0000000));

        // Simulate multiple transactions exceeding daily limit
        client.check_tx(&account, &400_0000000);
        client.check_tx(&account, &400_0000000);
        // Third transaction should fail (800 + 300 > 1000)
        assert!(!client.check_tx(&account, &300_0000000));
    }

    #[test]
    fn test_allowlist() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, PolicyContract);
        let client = PolicyContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let account = Address::generate(&env);
        let recipient = Address::generate(&env);

        client.init_policy(&account, &owner, &1000_0000000, &500_0000000, &3600);

        // Add recipient to allowlist
        client.add_to_allowlist(&account, &recipient, &owner);

        // Verify recipient is allowlisted
        assert!(client.is_allowlisted(&account, &recipient));
    }
}
