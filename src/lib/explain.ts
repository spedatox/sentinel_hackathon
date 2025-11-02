import type { Features } from "@/lib/risk";

export interface ExplainOptions {
  score?: number;
  reasons?: string[];
}

export function normalizeFactors(factors?: Partial<Features>): Features {
  return {
    z_amount: Number(factors?.z_amount ?? 0),
    new_recipient: Boolean(factors?.new_recipient),
    off_hours: Boolean(factors?.off_hours),
    freq_spike_ratio: Number(factors?.freq_spike_ratio ?? 1),
    recipient_concentration: Number(factors?.recipient_concentration ?? 0),
    asset_mix_l1: Number(factors?.asset_mix_l1 ?? 0),
    balance_ratio: Number(factors?.balance_ratio ?? 0),
    fast_outflow:
      factors?.fast_outflow === undefined ? undefined : Boolean(factors.fast_outflow),
    unknown_contract:
      factors?.unknown_contract === undefined ? undefined : Boolean(factors.unknown_contract),
  };
}

function formatFactorSummary(
  key: keyof Features,
  value: Features[keyof Features],
): string | null {
  switch (key) {
    case "z_amount": {
      const numeric = typeof value === "number" ? value : Number(value ?? 0);
      if (numeric >= 1) {
        return `amount ${numeric.toFixed(1)}x usual`;
      }
      return null;
    }
    case "new_recipient":
      return value ? "recipient is new" : null;
    case "off_hours":
      return value ? "sent outside usual hours" : null;
    case "freq_spike_ratio": {
      const numeric = typeof value === "number" ? value : Number(value ?? 0);
      if (numeric > 1.5) {
        return `activity spike ${numeric.toFixed(1)}x baseline`;
      }
      return null;
    }
    case "recipient_concentration": {
      const numeric = typeof value === "number" ? value : Number(value ?? 0);
      if (numeric > 0.6) {
        return "recent flow concentrated to one recipient";
      }
      return null;
    }
    case "asset_mix_l1": {
      const numeric = typeof value === "number" ? value : Number(value ?? 0);
      if (numeric > 0.4) {
        return "asset mix shifted from baseline";
      }
      return null;
    }
    case "balance_ratio": {
      const ratio = typeof value === "number" ? value : Number(value ?? 0);
      if (ratio >= 0.7) {
        return `sending ${Math.round(ratio * 100)}% of balance`;
      }
      if (ratio >= 0.4) {
        return `large balance draw (${Math.round(ratio * 100)}%)`;
      }
      return null;
    }
    case "fast_outflow":
      return value ? "rapid sequence of withdrawals" : null;
    case "unknown_contract":
      return value ? "destination contract unrecognized" : null;
    default:
      return null;
  }
}

function formatReason(reason: string): string | null {
  if (!reason) {
    return null;
  }

  const trimmed = reason.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes(" ")) {
    return trimmed;
  }

  if (trimmed.startsWith("amount_outlier_z=")) {
    const raw = Number(trimmed.split("=")[1] ?? "");
    if (Number.isFinite(raw)) {
      return `amount ${raw.toFixed(1)}x above trend`;
    }
    return "amount is far above trend";
  }

  if (trimmed.startsWith("robust_outlier=")) {
    const raw = Number(trimmed.split("=")[1] ?? "");
    if (Number.isFinite(raw)) {
      return `median deviation ${raw.toFixed(1)}x usual`;
    }
    return "median deviation flagged";
  }

  if (trimmed.startsWith("freq_spike_ratio=")) {
    const raw = Number(trimmed.split("=")[1] ?? "");
    if (Number.isFinite(raw)) {
      return `traffic spike ${raw.toFixed(1)}x usual`;
    }
    return "traffic spike above baseline";
  }

  switch (trimmed) {
    case "new_recipient":
      return "recipient is new";
    case "above_p95":
      return "amount above 95th percentile";
    case "off_hours":
      return "sent outside usual hours";
    case "huge_amount_backstop":
      return "exceeds configured safety cap";
    case "small_sample_backstop":
      return "history too sparse; using fallback limits";
    case "severe_new_recipient_block":
      return "blocked: severe anomaly for new recipient";
    default:
      return trimmed;
  }
}

export function listFactorHighlights(
  factors: Features,
  reasons: string[] = [],
): string[] {
  const highlights = new Set<string>();

  (Object.keys(factors) as (keyof Features)[]).forEach((key) => {
    const line = formatFactorSummary(key, factors[key]);
    if (line) {
      highlights.add(line);
    }
  });

  reasons.forEach((reason) => {
    const line = formatReason(reason);
    if (line) {
      highlights.add(line);
    }
  });

  return Array.from(highlights);
}

export function explainFactors(
  factors: Features,
  options: ExplainOptions = {},
) {
  const { score, reasons = [] } = options;
  const highlights = listFactorHighlights(factors, reasons);

  const intro =
    score !== undefined ? `Risk score ${score.toFixed(2)}` : "Risk factors detected";

  const summaryPart = highlights.length
    ? highlights.join("; ")
    : "no major anomalies detected";

  let recommendation = "Proceed normally.";
  if (score !== undefined) {
    if (score >= 0.5) {
      recommendation = "Hold for guardian approval before releasing funds.";
    } else if (score >= 0.2) {
      recommendation = "Complete step-up verification before sending.";
    }
  }

  return `${intro}: ${summaryPart}. ${recommendation}`;
}
