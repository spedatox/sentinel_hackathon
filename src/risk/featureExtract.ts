import { RISK_CONFIG, type RiskConfig } from './config';

export type CandidateTx = {
  walletId: string;
  asset: string;
  amount: number;
  to: string;
  createdAt: string;
};

export type HistorySample = {
  amount: number;
  createdAt: string;
  to: string;
};

export type WalletContext = {
  recentOut: HistorySample[];
  hourHist: number[];
  knownCounterparties: Set<string>;
  avg?: number;
  std?: number;
  p95?: number;
};

export type RiskFeatures = {
  asset: string;
  amount: number;
  avg: number;
  std: number;
  median: number;
  mad: number;
  p95: number;
  zAmount: number;
  zRobust: number;
  aboveP95: boolean;
  isNewRecipient: boolean;
  offHours: boolean;
  hourProb: number;
  freqSpikeRatio: number;
  recentCount15m: number;
  baselineCount15m: number;
  sampleSize: number;
  statsWindowLength: number;
};

type NumericSummary = {
  avg: number;
  std: number;
  median: number;
  mad: number;
  p95: number;
  sampleSize: number;
  statsWindowLength: number;
};

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const MAD_SCALE = 1.4826;

function clampHistory(
  samples: HistorySample[],
  candidateTime: number,
  config: RiskConfig,
): { filtered: HistorySample[]; windowLength: number } {
  const maxAgeMs = config.WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const filtered: HistorySample[] = [];
  let minTime = candidateTime;

  for (const sample of samples) {
    if (filtered.length >= config.WINDOW_MAX) break;
    const ts = new Date(sample.createdAt).getTime();
    if (!Number.isFinite(ts)) continue;
    if (ts > candidateTime) continue;
    if (candidateTime - ts > maxAgeMs) continue;
    filtered.push(sample);
    if (ts < minTime) {
      minTime = ts;
    }
  }

  return { filtered, windowLength: candidateTime - minTime };
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stddev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((sum, v) => {
      const diff = v - avg;
      return sum + diff * diff;
    }, 0) / (values.length - 1);
  return Math.sqrt(Math.max(variance, 0));
}

function sortedCopy(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = sortedCopy(values);
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower];
  const weight = rank - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * weight;
}

function median(values: number[]): number {
  return percentile(values, 50);
}

function mad(values: number[], med: number): number {
  if (!values.length) return 0;
  const deviations = values.map((v) => Math.abs(v - med));
  return median(deviations);
}

function computeNumericSummary(amounts: number[], overrides: WalletContext): NumericSummary {
  const sampleSize = amounts.length;
  if (!sampleSize) {
    return {
      avg: overrides.avg ?? 0,
      std: overrides.std ?? 0,
      median: 0,
      mad: 0,
      p95: overrides.p95 ?? 0,
      sampleSize,
      statsWindowLength: 0,
    };
  }

  const avg = overrides.avg ?? mean(amounts);
  const stdRaw = overrides.std ?? stddev(amounts, avg);
  const std = Math.max(stdRaw, avg * 0.05);
  const med = median(amounts);
  const madValue = mad(amounts, med);
  const p95 = overrides.p95 ?? percentile(amounts, 95);

  return {
    avg,
    std,
    median: med,
    mad: madValue,
    p95,
    sampleSize,
    statsWindowLength: 0, // placeholder, filled by caller
  };
}

function computeHourProb(hourHist: number[], hour: number, floor: number): { prob: number; offHours: boolean } {
  if (!Array.isArray(hourHist) || hourHist.length !== 24) {
    return { prob: 0, offHours: false };
  }
  const total = hourHist.reduce((sum, count) => sum + count, 0);
  if (total <= 0) {
    return { prob: 0, offHours: false };
  }
  const count = hourHist[hour] ?? 0;
  const prob = count / total;
  return { prob, offHours: prob < floor };
}

function computeFreqSpike(
  samples: HistorySample[],
  candidateTime: number,
  medianFn: (values: number[]) => number,
): { ratio: number; recentCount: number; baseline: number } {
  if (!samples.length) {
    return { ratio: 1, recentCount: 0, baseline: 0 };
  }

  let recentCount = 0;
  const bins = new Map<number, number>();

  for (const sample of samples) {
    const ts = new Date(sample.createdAt).getTime();
    if (!Number.isFinite(ts)) continue;
    if (candidateTime - ts <= FIFTEEN_MINUTES_MS && candidateTime >= ts) {
      recentCount += 1;
    }
    const bin = Math.floor(ts / FIFTEEN_MINUTES_MS);
    bins.set(bin, (bins.get(bin) ?? 0) + 1);
  }

  const counts = Array.from(bins.values());
  if (!counts.length) {
    return { ratio: 1, recentCount, baseline: 0 };
  }

  const baseline = medianFn(counts);
  if (baseline <= 0) {
    return { ratio: 1, recentCount, baseline };
  }

  return { ratio: recentCount / baseline, recentCount, baseline };
}

export function extractFeatures(
  candidate: CandidateTx,
  ctx: WalletContext,
  config: RiskConfig = RISK_CONFIG,
): RiskFeatures {
  const candidateTime = new Date(candidate.createdAt).getTime();
  if (!Number.isFinite(candidateTime)) {
    throw new Error('Invalid candidate timestamp');
  }

  const { filtered, windowLength } = clampHistory(ctx.recentOut ?? [], candidateTime, config);
  const amounts = filtered.map((sample) => sample.amount).filter((value) => Number.isFinite(value) && value >= 0);

  const summary = computeNumericSummary(amounts, ctx);
  summary.statsWindowLength = windowLength;

  const { avg, std, median: med, mad: madValue, p95, sampleSize } = summary;
  const zAmount = sampleSize >= 2 && std > 0 ? Math.abs((candidate.amount - avg) / std) : 0;

  let zRobust = 0;
  if (sampleSize >= 2) {
    if (madValue === 0) {
      zRobust = candidate.amount === med ? 0 : Number.POSITIVE_INFINITY;
    } else {
      zRobust = Math.abs(candidate.amount - med) / (MAD_SCALE * madValue);
    }
  }

  const candidateHour = new Date(candidate.createdAt).getUTCHours();
  const { prob: hourProb, offHours } = computeHourProb(ctx.hourHist ?? Array(24).fill(0), candidateHour, config.OFF_HOUR_PROB_FLOOR);

  const { ratio: freqSpikeRatio, recentCount: recentCount15m, baseline: baselineCount15m } = computeFreqSpike(
    filtered,
    candidateTime,
    median,
  );

  return {
    asset: candidate.asset,
    amount: candidate.amount,
    avg,
    std,
    median: med,
    mad: madValue,
    p95,
    zAmount,
    zRobust,
    aboveP95: sampleSize > 0 && candidate.amount > p95,
    isNewRecipient: !ctx.knownCounterparties?.has(candidate.to),
    offHours,
    hourProb,
    freqSpikeRatio,
    recentCount15m,
    baselineCount15m,
    sampleSize,
    statsWindowLength: summary.statsWindowLength,
  };
}
