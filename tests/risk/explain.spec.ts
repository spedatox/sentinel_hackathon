import { describe, it, expect } from "vitest";
import {
  explainFactors,
  listFactorHighlights,
  normalizeFactors,
} from "@/lib/explain";

describe("Risk explanation helpers", () => {
  it("normalizes partial factors with sensible defaults", () => {
    const factors = normalizeFactors({
      z_amount: 2.4,
      new_recipient: true,
      balance_ratio: 0.65,
    });

    expect(factors.z_amount).toBeCloseTo(2.4);
    expect(factors.new_recipient).toBe(true);
    expect(factors.balance_ratio).toBeCloseTo(0.65);
    expect(factors.freq_spike_ratio).toBe(1);
    expect(factors.asset_mix_l1).toBe(0);
  });

  it("surfaces balance ratio and reason highlights", () => {
    const factors = normalizeFactors({
      balance_ratio: 0.72,
    });
    const highlights = listFactorHighlights(factors, ["amount_outlier_z=3.2"]);

    expect(highlights).toContain("sending 72% of balance");
    expect(highlights).toContain("amount 3.2x above trend");
  });

  it("produces actionable summaries based on score", () => {
    const factors = normalizeFactors({
      new_recipient: true,
      off_hours: true,
    });

    const summary = explainFactors(factors, {
      score: 0.55,
      reasons: ["off_hours", "new_recipient"],
    });

    expect(summary).toContain("Risk score 0.55");
    expect(summary).toContain("recipient is new");
    expect(summary).toContain("Hold for guardian approval");
  });
});
