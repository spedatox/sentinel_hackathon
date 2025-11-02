export type RiskWeights = {
  isNewRecipient: number;
  zAmountGte2: number;
  zAmountGte3: number;
  zAmountGte4: number;
  zRobustGte3: number;
  zRobustGte4: number;
  aboveP95: number;
  offHours: number;
  freqSpikeGte3: number;
};

export type RiskConfig = {
  WINDOW_MAX: number;
  WINDOW_DAYS: number;
  OFF_HOUR_PROB_FLOOR: number;
  ABSOLUTE_CAPS: Record<string, number>;
  WEIGHTS: RiskWeights;
  BLOCK_SEVERE_NEW_RECIPIENT: boolean;
};

function readNumber(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(envKey: string, fallback: boolean): boolean {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  return ['true', '1', 'yes', 'on'].includes(raw.toLowerCase());
}

function readCaps(fallback: Record<string, number>): Record<string, number> {
  const raw = process.env.RISK_ABSOLUTE_CAPS_JSON;
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed).reduce<Record<string, number>>((acc, [key, value]) => {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
          acc[key] = numeric;
        }
        return acc;
      }, {});
    }
  } catch {
    // fall back to defaults
  }
  return fallback;
}

const DEFAULT_WEIGHTS: RiskWeights = {
  isNewRecipient: 0.25,
  zAmountGte2: 0.3,
  zAmountGte3: 0.4,
  zAmountGte4: 0.5,
  zRobustGte3: 0.3,
  zRobustGte4: 0.4,
  aboveP95: 0.2,
  offHours: 0.15,
  freqSpikeGte3: 0.2,
};

const DEFAULT_ABSOLUTE_CAPS: Record<string, number> = {
  XLM: 500,
  USDC: 2000,
};

function readWeights(fallback: RiskWeights): RiskWeights {
  const raw = process.env.RISK_WEIGHTS_JSON;
  if (!raw) return { ...fallback };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        isNewRecipient: readNumber('RISK_WEIGHT_IS_NEW_RECIPIENT', parsed.isNewRecipient ?? fallback.isNewRecipient),
        zAmountGte2: readNumber('RISK_WEIGHT_Z_AMOUNT_GTE2', parsed.zAmountGte2 ?? fallback.zAmountGte2),
        zAmountGte3: readNumber('RISK_WEIGHT_Z_AMOUNT_GTE3', parsed.zAmountGte3 ?? fallback.zAmountGte3),
        zAmountGte4: readNumber('RISK_WEIGHT_Z_AMOUNT_GTE4', parsed.zAmountGte4 ?? fallback.zAmountGte4),
        zRobustGte3: readNumber('RISK_WEIGHT_Z_ROBUST_GTE3', parsed.zRobustGte3 ?? fallback.zRobustGte3),
        zRobustGte4: readNumber('RISK_WEIGHT_Z_ROBUST_GTE4', parsed.zRobustGte4 ?? fallback.zRobustGte4),
        aboveP95: readNumber('RISK_WEIGHT_ABOVE_P95', parsed.aboveP95 ?? fallback.aboveP95),
        offHours: readNumber('RISK_WEIGHT_OFF_HOURS', parsed.offHours ?? fallback.offHours),
        freqSpikeGte3: readNumber('RISK_WEIGHT_FREQ_SPIKE_GTE3', parsed.freqSpikeGte3 ?? fallback.freqSpikeGte3),
      };
    }
  } catch {
    // fall back to defaults
  }

  return {
    isNewRecipient: readNumber('RISK_WEIGHT_IS_NEW_RECIPIENT', fallback.isNewRecipient),
    zAmountGte2: readNumber('RISK_WEIGHT_Z_AMOUNT_GTE2', fallback.zAmountGte2),
    zAmountGte3: readNumber('RISK_WEIGHT_Z_AMOUNT_GTE3', fallback.zAmountGte3),
    zAmountGte4: readNumber('RISK_WEIGHT_Z_AMOUNT_GTE4', fallback.zAmountGte4),
    zRobustGte3: readNumber('RISK_WEIGHT_Z_ROBUST_GTE3', fallback.zRobustGte3),
    zRobustGte4: readNumber('RISK_WEIGHT_Z_ROBUST_GTE4', fallback.zRobustGte4),
    aboveP95: readNumber('RISK_WEIGHT_ABOVE_P95', fallback.aboveP95),
    offHours: readNumber('RISK_WEIGHT_OFF_HOURS', fallback.offHours),
    freqSpikeGte3: readNumber('RISK_WEIGHT_FREQ_SPIKE_GTE3', fallback.freqSpikeGte3),
  };
}

export const RISK_CONFIG: RiskConfig = {
  WINDOW_MAX: readNumber('RISK_WINDOW_MAX', 100),
  WINDOW_DAYS: readNumber('RISK_WINDOW_DAYS', 90),
  OFF_HOUR_PROB_FLOOR: readNumber('RISK_OFF_HOUR_PROB_FLOOR', 0.02),
  ABSOLUTE_CAPS: readCaps(DEFAULT_ABSOLUTE_CAPS),
  WEIGHTS: readWeights(DEFAULT_WEIGHTS),
  BLOCK_SEVERE_NEW_RECIPIENT: readBoolean('RISK_BLOCK_SEVERE_NEW_RECIPIENT', false),
};
