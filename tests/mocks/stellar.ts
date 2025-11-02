/**
 * Mock Stellar/Horizon client for deterministic testing
 * No real network calls - all operations return predictable results
 */

export type StellarAccount = {
  publicKey: string;
  balance: string;
  sequence: string;
};

export type StellarTransaction = {
  hash: string;
  ledger: number;
  successful: boolean;
  error?: string;
};

export type StellarPaymentParams = {
  from: string;
  to: string;
  amount: string;
  asset?: string;
  memo?: string;
};

export interface IStellarClient {
  getBalance(publicKey: string): Promise<string>;
  getAccount(publicKey: string): Promise<StellarAccount>;
  buildPaymentXDR(params: StellarPaymentParams): Promise<string>;
  submitXDR(xdr: string): Promise<StellarTransaction>;
  getRecentPayments(publicKey: string, limit: number): Promise<any[]>;
}

/**
 * Mock Stellar client - all operations are deterministic
 */
export class MockStellarClient implements IStellarClient {
  private accounts: Map<string, StellarAccount> = new Map();
  private submittedTransactions: StellarTransaction[] = [];
  private failureMode: 'none' | 'tx_bad_auth' | 'underfunded' | 'timeout' = 'none';
  private submitCount = 0;

  constructor() {
    this.reset();
  }

  /**
   * Reset mock to initial state
   */
  reset(): void {
    this.accounts.clear();
    this.submittedTransactions = [];
    this.failureMode = 'none';
    this.submitCount = 0;

    // Add default test accounts
    this.addAccount('GDSR...TEST', '1000', '1');
    this.addAccount('GDSR...ALICE', '500', '1');
    this.addAccount('GDSR...BOB', '2000', '1');
  }

  /**
   * Add a test account
   */
  addAccount(publicKey: string, balance: string, sequence: string = '1'): void {
    this.accounts.set(publicKey, { publicKey, balance, sequence });
  }

  /**
   * Set failure mode for next submit
   */
  setFailureMode(mode: 'none' | 'tx_bad_auth' | 'underfunded' | 'timeout'): void {
    this.failureMode = mode;
  }

  /**
   * Get all submitted transactions
   */
  getSubmittedTransactions(): StellarTransaction[] {
    return [...this.submittedTransactions];
  }

  /**
   * Clear submitted transactions
   */
  clearSubmittedTransactions(): void {
    this.submittedTransactions = [];
  }

  async getBalance(publicKey: string): Promise<string> {
    const account = this.accounts.get(publicKey);
    if (!account) {
      throw new Error(`Account ${publicKey} not found`);
    }
    return account.balance;
  }

  async getAccount(publicKey: string): Promise<StellarAccount> {
    const account = this.accounts.get(publicKey);
    if (!account) {
      throw new Error(`Account ${publicKey} not found`);
    }
    return { ...account };
  }

  async buildPaymentXDR(params: StellarPaymentParams): Promise<string> {
    // Return deterministic XDR based on params
    const { from, to, amount, asset = 'XLM', memo = '' } = params;
    
    // Validate account exists
    if (!this.accounts.has(from)) {
      throw new Error(`Source account ${from} not found`);
    }

    // Create fake but deterministic XDR
    const xdrBase = `${from}:${to}:${amount}:${asset}:${memo}`;
    const xdr = Buffer.from(xdrBase).toString('base64');
    
    return `AAAAAQAAAA${xdr}==`;
  }

  async submitXDR(xdr: string): Promise<StellarTransaction> {
    this.submitCount++;

    // Simulate failures based on failure mode
    if (this.failureMode === 'tx_bad_auth') {
      const error: StellarTransaction = {
        hash: '',
        ledger: 0,
        successful: false,
        error: 'tx_bad_auth',
      };
      this.submittedTransactions.push(error);
      throw new Error('tx_bad_auth');
    }

    if (this.failureMode === 'underfunded') {
      const error: StellarTransaction = {
        hash: '',
        ledger: 0,
        successful: false,
        error: 'underfunded',
      };
      this.submittedTransactions.push(error);
      throw new Error('underfunded');
    }

    if (this.failureMode === 'timeout') {
      throw new Error('ETIMEDOUT');
    }

    // Success case - create deterministic hash
    const hash = this.generateDeterministicHash(xdr, this.submitCount);
    const ledger = 1000000 + this.submitCount;

    const transaction: StellarTransaction = {
      hash,
      ledger,
      successful: true,
    };

    this.submittedTransactions.push(transaction);
    return transaction;
  }

  async getRecentPayments(publicKey: string, limit: number): Promise<any[]> {
    // Return empty array - we use mocked history in tests
    return [];
  }

  /**
   * Generate deterministic transaction hash
   */
  private generateDeterministicHash(xdr: string, count: number): string {
    const input = `${xdr}:${count}`;
    // Simple hash function for testing
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
    return `${hexHash}${'a'.repeat(56)}`.slice(0, 64);
  }

  /**
   * Get submit count
   */
  getSubmitCount(): number {
    return this.submitCount;
  }
}

// Singleton instance for tests
export const mockStellarClient = new MockStellarClient();

/**
 * Reset mock to initial state
 */
export function resetMockStellar(): void {
  mockStellarClient.reset();
}

/**
 * Helper to assert transaction was submitted
 */
export function assertTransactionSubmitted(expectedCount: number = 1): void {
  const submitted = mockStellarClient.getSubmittedTransactions();
  if (submitted.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} submitted transaction(s), got ${submitted.length}`,
    );
  }
}

/**
 * Helper to assert no transactions submitted
 */
export function assertNoTransactionsSubmitted(): void {
  const submitted = mockStellarClient.getSubmittedTransactions();
  if (submitted.length > 0) {
    throw new Error(`Expected no submitted transactions, got ${submitted.length}`);
  }
}

/**
 * Helper to get last submitted transaction
 */
export function getLastSubmittedTransaction(): StellarTransaction | null {
  const submitted = mockStellarClient.getSubmittedTransactions();
  return submitted.length > 0 ? submitted[submitted.length - 1] : null;
}
