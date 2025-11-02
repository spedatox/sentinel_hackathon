import { RISK_CONFIG, type RiskConfig } from './config';
import type { RiskFeatures } from './featureExtract';

export type RiskBucket = 'low' | 'medium' | 'high';
export type RiskDecision = 'allow' | 'require_step_up' | 'block';

export type RiskResult = {
  score: number;
  bucket: RiskBucket;
  decision: RiskDecision;
  reasons: string[];
  factors: Record<string, number | string | boolean>;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function determineBucket(score: number): RiskBucket {
  if (score >= 0.5) return 'high';
  if (score >= 0.2) return 'medium';
  return 'low';
}

function baseDecision(bucket: RiskBucket): RiskDecision {
  if (bucket === 'low') return 'allow';
  return 'require_step_up';
}

function addReason(reasons: Set<string>, reason: string | undefined) {
  if (reason) {
    reasons.add(reason);
  }
}

function formatTagValue(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : 'inf';
}

function getAbsoluteCap(asset: string, config: RiskConfig): number {
  const caps = config.ABSOLUTE_CAPS ?? {};
  if (asset in caps) return caps[asset];
  if ('DEFAULT' in caps) return caps.DEFAULT;
  return Number.POSITIVE_INFINITY;
}

export function score(features: RiskFeatures, config: RiskConfig = RISK_CONFIG): RiskResult {
  const reasons = new Set<string>();
  const weights = config.WEIGHTS;

  let scoreValue = 0;

  if (features.isNewRecipient) {
    scoreValue += weights.isNewRecipient;
    addReason(reasons, 'new_recipient');
  }

  if (features.zAmount >= 4) {
    scoreValue += weights.zAmountGte4;
    addReason(reasons, `amount_outlier_z=${formatTagValue(features.zAmount)}`);
  } else if (features.zAmount >= 3) {
    scoreValue += weights.zAmountGte3;
    addReason(reasons, `amount_outlier_z=${formatTagValue(features.zAmount)}`);
  } else if (features.zAmount >= 2) {
    scoreValue += weights.zAmountGte2;
    addReason(reasons, `amount_outlier_z=${formatTagValue(features.zAmount)}`);
  }

  const zRobust = Number.isFinite(features.zRobust) ? features.zRobust : Number.POSITIVE_INFINITY;
  if (zRobust >= 4) {
    scoreValue += weights.zRobustGte4;
    addReason(reasons, `robust_outlier=${formatTagValue(zRobust)}`);
  } else if (zRobust >= 3) {
    scoreValue += weights.zRobustGte3;
    addReason(reasons, `robust_outlier=${formatTagValue(zRobust)}`);
  }

  if (features.aboveP95) {
    scoreValue += weights.aboveP95;
    addReason(reasons, 'above_p95');
  }

  if (features.offHours) {
    scoreValue += weights.offHours;
    addReason(reasons, 'off_hours');
  }

  if (features.freqSpikeRatio >= 3) {
    scoreValue += weights.freqSpikeGte3;
    addReason(reasons, `freq_spike_ratio=${formatTagValue(features.freqSpikeRatio)}`);
  }

  let adjustedScore = clampScore(scoreValue);

  const absoluteCap = getAbsoluteCap(features.asset, config);
  const statThreshold = Math.max(features.p95 * 2, features.avg * 5);
  const thresholds: number[] = [];
  if (Number.isFinite(statThreshold) && statThreshold > 0) {
    thresholds.push(statThreshold);
  }
  if (Number.isFinite(absoluteCap) && absoluteCap > 0) {
    thresholds.push(absoluteCap);
  }
  const hugeThreshold = thresholds.length ? Math.min(...thresholds) : Number.POSITIVE_INFINITY;

  if (features.amount > hugeThreshold) {
    adjustedScore = Math.max(adjustedScore, 0.7);
    addReason(reasons, 'huge_amount_backstop');
  }

  if (features.sampleSize < 10 && features.avg > 0 && features.amount >= features.avg * 3) {
    adjustedScore = Math.max(adjustedScore, 0.6);
    addReason(reasons, 'small_sample_backstop');
  }

  const bucket = determineBucket(adjustedScore);
  let decision = baseDecision(bucket);

  if (
    config.BLOCK_SEVERE_NEW_RECIPIENT &&
    features.isNewRecipient &&
    (features.zAmount >= 4 || (features.p95 > 0 && features.amount > features.p95 * 3))
  ) {
    decision = 'block';
    addReason(reasons, 'severe_new_recipient_block');
  }

  const factors: Record<string, number | string | boolean> = {
    asset: features.asset,
    amount: features.amount,
    avg: features.avg,
    std: features.std,
    median: features.median,
    mad: features.mad,
    p95: features.p95,
    zAmount: features.zAmount,
    zRobust: features.zRobust,
    aboveP95: features.aboveP95,
    isNewRecipient: features.isNewRecipient,
    offHours: features.offHours,
    hourProb: features.hourProb,
    freqSpikeRatio: features.freqSpikeRatio,
    recentCount15m: features.recentCount15m,
    baselineCount15m: features.baselineCount15m,
    sampleSize: features.sampleSize,
    statsWindowLengthMs: features.statsWindowLength,
    hugeAmountThreshold: Number.isFinite(hugeThreshold) ? hugeThreshold : 0,
  };

  return {
    score: Number(adjustedScore.toFixed(4)),
    bucket,
    decision,
    reasons: Array.from(reasons),
    factors,
  };
}
