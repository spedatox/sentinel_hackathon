import type { HistorySample } from '@/risk/featureExtract';

export type WalletHistoryOptions = {
  count: number;
  meanAmount: number;
  stdAmount: number;
  startTime: number; // Unix timestamp
  intervalMinutes?: number;
  recipients?: string[];
  asset?: string;
  hourDistribution?: 'daytime' | 'evening' | 'uniform' | 'night';
};

/**
 * Generate synthetic wallet history for deterministic testing
 */
export function generateWalletHistory(options: WalletHistoryOptions): HistorySample[] {
  const {
    count,
    meanAmount,
    stdAmount,
    startTime,
    intervalMinutes = 1440, // 1 day default
    recipients = ['GDSR...DEFAULT'],
    asset = 'XLM',
    hourDistribution = 'daytime',
  } = options;

  const history: HistorySample[] = [];
  const intervalMs = intervalMinutes * 60 * 1000;

  for (let i = 0; i < count; i++) {
    // Generate amount with normal distribution (using Box-Muller transform)
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const amount = Math.max(1, meanAmount + z0 * stdAmount);

    // Calculate timestamp going backwards from startTime
    const baseTime = startTime - (i * intervalMs);

    // Adjust time based on hour distribution
    const date = new Date(baseTime);
    let hour = date.getUTCHours();

    switch (hourDistribution) {
      case 'daytime':
        // Concentrate between 9 AM and 6 PM
        hour = 9 + Math.floor(Math.random() * 9);
        break;
      case 'evening':
        // Concentrate between 6 PM and 11 PM
        hour = 18 + Math.floor(Math.random() * 5);
        break;
      case 'night':
        // Concentrate between 11 PM and 5 AM
        hour = (23 + Math.floor(Math.random() * 6)) % 24;
        break;
      case 'uniform':
        // Keep original hour
        break;
    }

    date.setUTCHours(hour);
    date.setUTCMinutes(Math.floor(Math.random() * 60));

    // Pick recipient (round-robin or random)
    const recipientIndex = Math.floor(Math.random() * recipients.length);
    const to = recipients[recipientIndex];

    history.push({
      amount: Math.round(amount * 100) / 100, // Round to 2 decimals
      createdAt: date.toISOString(),
      to,
    });
  }

  // Sort by createdAt descending (newest first)
  history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return history;
}

/**
 * Generate a wallet history with a specific pattern
 */
export function generatePatternHistory(
  pattern: 'normal' | 'volatile' | 'whale' | 'steady' | 'minimal',
  baseTime: number,
): HistorySample[] {
  switch (pattern) {
    case 'normal':
      return generateWalletHistory({
        count: 30,
        meanAmount: 15,
        stdAmount: 5,
        startTime: baseTime,
        intervalMinutes: 2880, // ~2 days
        recipients: ['GDSR...A', 'GDSR...B', 'GDSR...C'],
        hourDistribution: 'daytime',
      });

    case 'volatile':
      return generateWalletHistory({
        count: 40,
        meanAmount: 50,
        stdAmount: 30,
        startTime: baseTime,
        intervalMinutes: 1440, // 1 day
        recipients: ['GDSR...X', 'GDSR...Y', 'GDSR...Z'],
        hourDistribution: 'uniform',
      });

    case 'whale':
      // Include one massive outlier
      const base = generateWalletHistory({
        count: 29,
        meanAmount: 20,
        stdAmount: 5,
        startTime: baseTime,
        intervalMinutes: 2880,
        recipients: ['GDSR...WHALE1', 'GDSR...WHALE2'],
        hourDistribution: 'daytime',
      });
      // Insert one whale transaction
      base.splice(10, 0, {
        amount: 1000,
        createdAt: new Date(baseTime - 10 * 2880 * 60 * 1000).toISOString(),
        to: 'GDSR...WHALE3',
      });
      return base;

    case 'steady':
      return generateWalletHistory({
        count: 50,
        meanAmount: 10,
        stdAmount: 1,
        startTime: baseTime,
        intervalMinutes: 720, // 12 hours
        recipients: ['GDSR...STEADY'],
        hourDistribution: 'daytime',
      });

    case 'minimal':
      return generateWalletHistory({
        count: 5,
        meanAmount: 20,
        stdAmount: 5,
        startTime: baseTime,
        intervalMinutes: 10080, // 1 week
        recipients: ['GDSR...MIN1', 'GDSR...MIN2'],
        hourDistribution: 'uniform',
      });

    default:
      return [];
  }
}

/**
 * Add specific transactions to existing history
 */
export function addTransactions(
  history: HistorySample[],
  transactions: Array<{ amount: number; to: string; hoursAgo: number }>,
  baseTime: number,
): HistorySample[] {
  const newHistory = [...history];

  for (const tx of transactions) {
    const createdAt = new Date(baseTime - tx.hoursAgo * 60 * 60 * 1000).toISOString();
    newHistory.push({
      amount: tx.amount,
      createdAt,
      to: tx.to,
    });
  }

  // Re-sort
  newHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return newHistory;
}

/**
 * Create a sparse history (few transactions over long period)
 */
export function generateSparseHistory(baseTime: number): HistorySample[] {
  return [
    {
      amount: 10,
      createdAt: new Date(baseTime - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
      to: 'GDSR...SPARSE1',
    },
    {
      amount: 15,
      createdAt: new Date(baseTime - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
      to: 'GDSR...SPARSE1',
    },
    {
      amount: 20,
      createdAt: new Date(baseTime - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      to: 'GDSR...SPARSE2',
    },
  ];
}

/**
 * Create an empty history
 */
export function generateEmptyHistory(): HistorySample[] {
  return [];
}

/**
 * Extract known recipients from history
 */
export function extractKnownRecipients(history: HistorySample[]): Set<string> {
  return new Set(history.map((tx) => tx.to));
}

/**
 * Generate hour histogram from history
 */
export function generateHourHistogram(history: HistorySample[]): number[] {
  const histogram = new Array(24).fill(0);

  for (const tx of history) {
    const date = new Date(tx.createdAt);
    const hour = date.getUTCHours();
    histogram[hour]++;
  }

  return histogram;
}
