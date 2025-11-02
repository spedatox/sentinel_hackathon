import { describe, expect, it } from 'vitest';
import { evaluateRisk, type CandidateTx, type HistorySample, type WalletContext } from '../src/risk';

const BASE_TIME = new Date('2025-01-10T12:00:00Z').getTime();

function isoAt(offsetMs: number): string {
  return new Date(BASE_TIME - offsetMs).toISOString();
}

function buildHistory(amounts: number[], options?: { stepMinutes?: number; toPrefix?: string }): HistorySample[] {
  const step = (options?.stepMinutes ?? 30) * 60 * 1000;
  const prefix = options?.toPrefix ?? 'known';
  return amounts.map((amount, index) => ({
    amount,
    createdAt: isoAt(index * step),
    to: `${prefix}-${index % 5}`,
  }));
}

function baseContext(overrides?: Partial<WalletContext>): WalletContext {
  return {
    recentOut: [],
    hourHist: Array.from({ length: 24 }, () => 0),
    knownCounterparties: new Set<string>(),
    ...overrides,
  };
}

function candidate(amount: number, overrides?: Partial<CandidateTx>): CandidateTx {
  return {
    walletId: 'wallet-123',
    asset: overrides?.asset ?? 'XLM',
    amount,
    to: overrides?.to ?? 'known-0',
    createdAt: overrides?.createdAt ?? new Date(BASE_TIME + 5 * 60 * 1000).toISOString(),
  };
}

describe('Risk engine', () => {
  it('flags normal tiny send as low risk', () => {
    const history = buildHistory(
      Array.from({ length: 30 }, (_, i) => 10 + (i % 10)),
      { stepMinutes: 60 },
    );
    const ctx = baseContext({
      recentOut: history,
      hourHist: history.reduce((hist, sample) => {
        const hour = new Date(sample.createdAt).getUTCHours();
        hist[hour] = (hist[hour] ?? 0) + 1;
        return hist;
      }, Array.from({ length: 24 }, () => 0)),
      knownCounterparties: new Set(history.map((h) => h.to)),
    });

    const result = evaluateRisk(candidate(15), ctx);
    expect(result.bucket).toBe('low');
    expect(result.score).toBeLessThan(0.1);
    expect(result.reasons).toHaveLength(0);
  });

  it('detects large spike for known recipient', () => {
    const history = buildHistory(Array(40).fill(0).map((_, i) => 18 + (i % 5)), { stepMinutes: 45 });
    const recipient = history[0]?.to ?? 'known-0';
    const ctx = baseContext({
      recentOut: history,
      hourHist: history.reduce((hist, sample) => {
        const hour = new Date(sample.createdAt).getUTCHours();
        hist[hour] = (hist[hour] ?? 0) + 1;
        return hist;
      }, Array.from({ length: 24 }, () => 0)),
      knownCounterparties: new Set(history.map((h) => h.to)),
    });

    const hugeSend = evaluateRisk(
      candidate(500, { to: recipient }),
      ctx,
    );

    expect(hugeSend.bucket).toBe('high');
    expect(hugeSend.score).toBeGreaterThanOrEqual(0.5);
    expect(hugeSend.reasons.some((reason) => reason.startsWith('amount_outlier_z'))).toBe(true);
    const extremeSend = evaluateRisk(
      candidate(5000, { to: recipient }),
      ctx,
    );
    expect(extremeSend.bucket).toBe('high');
    expect(extremeSend.score).toBeGreaterThanOrEqual(0.7);
    expect(extremeSend.reasons).toContain('huge_amount_backstop');
  });

  it('treats new recipient modest amount as elevated', () => {
    const history = buildHistory(Array.from({ length: 25 }, (_, i) => 45 + (i % 10)), {
      stepMinutes: 50,
      toPrefix: 'friend',
    });
    const ctx = baseContext({
      recentOut: history,
      hourHist: history.reduce((hist, sample) => {
        const hour = new Date(sample.createdAt).getUTCHours();
        hist[hour] = (hist[hour] ?? 0) + 1;
        return hist;
      }, Array.from({ length: 24 }, () => 0)),
      knownCounterparties: new Set(history.map((h) => h.to)),
    });

    const result = evaluateRisk(
      candidate(80, {
        to: 'new-addr',
      }),
      ctx,
    );

    expect(result.bucket === 'medium' || result.bucket === 'high').toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0.2);
    expect(result.reasons).toContain('new_recipient');
  });

  it('notes off-hours activity when hour histogram is quiet', () => {
    const history = buildHistory(Array.from({ length: 20 }, (_, i) => 24 + (i % 3)), { stepMinutes: 60 });
    const hourHist = Array.from({ length: 24 }, () => 0);
    history.forEach((sample) => {
      const hour = new Date(sample.createdAt).getUTCHours();
      hourHist[hour] += 1;
    });
    // Boost daylight hours
    for (let hour = 10; hour <= 18; hour += 1) {
      hourHist[hour] += 5;
    }

    const ctx = baseContext({
      recentOut: history,
      hourHist,
      knownCounterparties: new Set(history.map((h) => h.to)),
    });

    const result = evaluateRisk(candidate(25, { createdAt: new Date('2025-01-11T03:00:00Z').toISOString() }), ctx);

    expect(result.factors.offHours).toBe(true);
    expect(result.reasons).toContain('off_hours');
    expect(result.score).toBeLessThanOrEqual(0.2);
  });

  it('applies small sample backstop', () => {
    const amounts = [20, 22, 21, 19, 20];
    const history = buildHistory(amounts, { stepMinutes: 120 });
    const ctx = baseContext({
      recentOut: history,
      hourHist: Array.from({ length: 24 }, () => 1),
      knownCounterparties: new Set(history.map((h) => h.to)),
    });

    const result = evaluateRisk(candidate(70), ctx);
    expect(result.score).toBeGreaterThanOrEqual(0.6);
    expect(result.bucket).toBe('high');
    expect(result.reasons).toContain('small_sample_backstop');
  });

  it('leans on robust stats for skewed history', () => {
    const baseline = Array.from({ length: 40 }, (_, i) => 20 + (i % 6));
    const skew = [1000];
    const history = buildHistory([...baseline, ...skew], { stepMinutes: 20 });
    const ctx = baseContext({
      recentOut: history,
      hourHist: Array.from({ length: 24 }, () => 4),
      knownCounterparties: new Set(history.map((h) => h.to)),
    });

    const result = evaluateRisk(candidate(120), ctx);
    expect(result.bucket).toBe('high');
    expect(result.reasons.some((reason) => reason.startsWith('robust_outlier='))).toBe(true);
  });

  it('raises huge amount backstop via p95 threshold', () => {
    const amounts = [
      10, 12, 14, 15, 16, 18, 19, 20, 21, 22,
      23, 24, 25, 26, 27, 28, 30, 32, 75, 80,
    ];
    const history = buildHistory(amounts, { stepMinutes: 35 });
    const ctx = baseContext({
      recentOut: history,
      hourHist: Array.from({ length: 24 }, () => 3),
      knownCounterparties: new Set(history.map((h) => h.to)),
    });

    const result = evaluateRisk(candidate(200), ctx);
    expect(result.bucket).toBe('high');
    expect(result.reasons).toContain('huge_amount_backstop');
  });

  it('treats zeroed hour histogram as neutral for off-hours', () => {
    const history = buildHistory(Array.from({ length: 5 }, () => 30), { stepMinutes: 1440 });
    const ctx = baseContext({
      recentOut: history,
      hourHist: Array.from({ length: 24 }, () => 0),
      knownCounterparties: new Set(history.map((h) => h.to)),
    });

    const result = evaluateRisk(candidate(35), ctx);
    expect(result.factors.offHours).toBe(false);
    expect(result.reasons.includes('off_hours')).toBe(false);
  });
});
