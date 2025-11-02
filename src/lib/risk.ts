import { getPayments, HorizonPaymentRecord, normalizePayment } from './horizon';

export interface TxInput {
  to: string;
  amount: number;
  asset: string;
  ts: string;
}

export interface Features {
  z_amount: number;
  new_recipient: boolean;
  off_hours: boolean;
  freq_spike_ratio: number;
  recipient_concentration: number;
  asset_mix_l1: number;
  balance_ratio: number; // Ratio of transaction amount to total balance (0-1)
  fast_outflow?: boolean;
  unknown_contract?: boolean;
}

export interface RiskScore {
  score: number;
  bucket: 'low' | 'medium' | 'high';
  factors: Features;
  reasons: string[];
  historySampleSize: number;
}

interface BaselineStats {
  mean: number;
  std: number;
  recipients: Map<string, number>;
  totalTxCount: number;
  assetHistogram: Map<string, number>;
  hourHistogram: number[];
  dailyCounts: Map<string, number>;
}

function bucket(score: number): 'low' | 'medium' | 'high' {
  if (score < 0.3) return 'low';
  if (score < 0.6) return 'medium';
  return 'high';
}

function score(features: Features): number {
  let s = 0;
  s += 0.20 * Math.min(1, Math.max(0, features.z_amount / 3));
  s += 0.15 * (features.new_recipient ? 1 : 0);
  s += 0.10 * (features.off_hours ? 1 : 0);
  s += 0.15 * Math.min(1, features.freq_spike_ratio / 5);
  s += 0.10 * Math.min(1, features.asset_mix_l1);
  s += 0.10 * Math.min(1, features.recipient_concentration);
  // Balance ratio: high percentage of total balance is very risky
  s += 0.20 * Math.min(1, features.balance_ratio);
  return Math.min(1, Math.max(0, s));
}

function safeNumber(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return value;
}

function calculateMeanStd(values: number[]) {
  if (!values.length) {
    return { mean: 0, std: 0 };
  }
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / Math.max(values.length - 1, 1);
  return { mean, std: Math.sqrt(Math.max(variance, 0)) };
}

function buildBaseline(records: HorizonPaymentRecord[]): BaselineStats {
  const amounts: number[] = [];
  const recipients = new Map<string, number>();
  const assetHistogram = new Map<string, number>();
  const hourHistogram = Array.from({ length: 24 }, () => 0);
  const dailyCounts = new Map<string, number>();

  records.forEach((record) => {
    const normalized = normalizePayment(record);
    const amount = safeNumber(normalized.amount);
    if (amount > 0) {
      amounts.push(amount);
    }

    if (normalized.to) {
      const key = normalized.to;
      recipients.set(key, (recipients.get(key) || 0) + 1);
    }

    const assetKey = normalized.asset || 'UNKNOWN';
    assetHistogram.set(assetKey, (assetHistogram.get(assetKey) || 0) + 1);

    const createdAt = new Date(normalized.createdAt);
    if (!Number.isNaN(createdAt.getTime())) {
      hourHistogram[createdAt.getUTCHours()] += 1;

      const dayKey = createdAt.toISOString().slice(0, 10);
      dailyCounts.set(dayKey, (dailyCounts.get(dayKey) || 0) + 1);
    }
  });

  const { mean, std } = calculateMeanStd(amounts);

  return {
    mean,
    std,
    recipients,
    totalTxCount: records.length,
    assetHistogram,
    hourHistogram,
    dailyCounts,
  };
}

function computeZAmount(amount: number, mean: number, std: number): number {
  if (std === 0) {
    if (mean === 0) return 1; // no history, treat as elevated
    return Math.abs(amount - mean) / Math.max(mean, 1);
  }
  return (amount - mean) / std;
}

function computeOffHours(ts: string, hourHistogram: number[], totalTxCount: number): boolean {
  if (!totalTxCount) {
    // With no history default to strict mode: treat late night (23-7) as off-hours.
    const date = new Date(ts);
    const hour = date.getUTCHours();
    return hour >= 23 || hour < 7;
  }

  const date = new Date(ts);
  const hour = date.getUTCHours();

  let activeRange: [number, number] | null = null;
  let streakStart = 0;
  let streakLength = 0;

  // Determine the most active contiguous 8-hour window.
  for (let i = 0; i < 24; i += 1) {
    const count = hourHistogram[i];
    if (count > 0) {
      if (streakLength === 0) {
        streakStart = i;
      }
      streakLength += 1;
    } else {
      if (streakLength >= 6 && (!activeRange || streakLength > activeRange[1] - activeRange[0])) {
        activeRange = [streakStart, streakStart + streakLength];
      }
      streakLength = 0;
    }
  }

  if (streakLength >= 6 && (!activeRange || streakLength > activeRange[1] - activeRange[0])) {
    activeRange = [streakStart, streakStart + streakLength];
  }

  if (!activeRange) {
    // fall back: treat hours with above-average frequency as active
    const avg = totalTxCount / 24;
    activeRange = [0, 24];
    const isActive = hourHistogram[hour] >= avg;
    return !isActive;
  }

  const [start, end] = activeRange;
  if (start <= hour && hour < end) {
    return false;
  }

  // handle wrap-around
  const normalizedHour = hour < start ? hour + 24 : hour;
  return !(start <= normalizedHour && normalizedHour < end);
}

function computeFreqSpikeRatio(ts: string, dailyCounts: Map<string, number>): number {
  if (!dailyCounts.size) {
    return 1;
  }
  const dayKey = ts.slice(0, 10);
  const todayCount = dailyCounts.get(dayKey) || 0;

  const total = Array.from(dailyCounts.values()).reduce((sum, v) => sum + v, 0);
  const avg = total / dailyCounts.size;
  if (avg === 0) {
    return todayCount > 0 ? todayCount : 1;
  }
  return todayCount / avg;
}

function computeRecipientConcentration(recipients: Map<string, number>): number {
  if (!recipients.size) {
    return 0;
  }
  const total = Array.from(recipients.values()).reduce((sum, v) => sum + v, 0);
  if (total === 0) {
    return 0;
  }
  const top = Math.max(...recipients.values());
  return top / total;
}

function computeAssetMixL1(asset: string, assetHistogram: Map<string, number>): number {
  if (!assetHistogram.size) {
    return asset === 'XLM' ? 0 : 1;
  }
  const total = Array.from(assetHistogram.values()).reduce((sum, v) => sum + v, 0);
  const baseline = new Map(assetHistogram);

  const newTotal = total + 1;
  let l1 = 0;

  baseline.forEach((count, key) => {
    const baselineRatio = count / total;
    const updatedRatio = (key === asset ? count + 1 : count) / newTotal;
    l1 += Math.abs(updatedRatio - baselineRatio);
  });

  if (!baseline.has(asset)) {
    l1 += 1 / newTotal;
  }

  return Math.min(1, l1 / 2); // normalize to 0..1
}

function buildReasons(factors: Features): string[] {
  const reasons: string[] = [];
  if (factors.balance_ratio > 0.7) {
    reasons.push(`sending ${(factors.balance_ratio * 100).toFixed(0)}% of total balance (account draining risk)`);
  } else if (factors.balance_ratio > 0.5) {
    reasons.push(`sending ${(factors.balance_ratio * 100).toFixed(0)}% of total balance`);
  }
  if (factors.z_amount >= 1) {
    reasons.push(`amount is ${factors.z_amount.toFixed(1)}x above usual`);
  }
  if (factors.new_recipient) {
    reasons.push('new recipient');
  }
  if (factors.off_hours) {
    reasons.push('off-hours timing');
  }
  if (factors.freq_spike_ratio > 1.5) {
    reasons.push('activity spike today');
  }
  if (factors.recipient_concentration > 0.6) {
    reasons.push('recipient concentration high');
  }
  if (factors.asset_mix_l1 > 0.4) {
    reasons.push('asset mix shift');
  }
  return reasons;
}

export async function scoreTransaction(
  account: string, 
  tx: TxInput, 
  accountBalance?: number
): Promise<RiskScore> {
  const history = await getPayments(account, 60);
  const baseline = buildBaseline(history);

  const zAmount = safeNumber(computeZAmount(tx.amount, baseline.mean, baseline.std));
  const newRecipient = baseline.recipients.size
    ? !baseline.recipients.has(tx.to)
    : true;
  const offHours = computeOffHours(tx.ts, baseline.hourHistogram, baseline.totalTxCount);
  const freqSpike = computeFreqSpikeRatio(tx.ts, baseline.dailyCounts);
  const concentration = computeRecipientConcentration(baseline.recipients);
  const assetMix = computeAssetMixL1(tx.asset, baseline.assetHistogram);
  
  // Calculate balance ratio: what percentage of total balance is being sent
  // High ratio (>0.7) is very dangerous as it could be draining the account
  let balanceRatio = 0;
  if (accountBalance && accountBalance > 0) {
    balanceRatio = Math.min(1, tx.amount / accountBalance);
  }

  const factors: Features = {
    z_amount: Number.isFinite(zAmount) ? zAmount : 0,
    new_recipient: newRecipient,
    off_hours: offHours,
    freq_spike_ratio: Number.isFinite(freqSpike) ? freqSpike : 1,
    recipient_concentration: Number.isFinite(concentration) ? concentration : 0,
    asset_mix_l1: Number.isFinite(assetMix) ? assetMix : 0,
    balance_ratio: Number.isFinite(balanceRatio) ? balanceRatio : 0,
  };

  const aggregateScore = score(factors);

  return {
    score: aggregateScore,
    bucket: bucket(aggregateScore),
    factors,
    reasons: buildReasons(factors),
    historySampleSize: history.length,
  };
}

