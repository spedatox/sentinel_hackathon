import { describe, it, expect, beforeEach } from 'vitest';
import { RISK_CONFIG } from '@/risk/config';
import { extractFeatures } from '@/risk/featureExtract';
import { score } from '@/risk/score';
import {
  generateWalletHistory,
  generatePatternHistory,
  extractKnownRecipients,
  generateHourHistogram,
  addTransactions,
} from '../fixtures/walletHistory';

// Fixed time for deterministic tests
const FIXED_TIME = new Date('2024-03-15T14:30:00.000Z').getTime();

describe('Risk Engine - Feature Extraction', () => {
  it('should extract baseline features from normal history', () => {
    const history = generateWalletHistory({
      count: 30,
      meanAmount: 15,
      stdAmount: 5,
      startTime: FIXED_TIME,
      recipients: ['GDSR...A', 'GDSR...B'],
      hourDistribution: 'daytime',
    });

    const candidate = {
      walletId: 'test-wallet',
      asset: 'XLM',
      amount: 15,
      to: 'GDSR...A',
      createdAt: new Date(FIXED_TIME).toISOString(),
    };

    const knownRecipients = extractKnownRecipients(history);
    const hourHist = generateHourHistogram(history);

    const context = {
      recentOut: history,
      hourHist,
      knownCounterparties: knownRecipients,
    };

    const features = extractFeatures(candidate, context);

    expect(features.asset).toBe('XLM');
    expect(features.amount).toBe(15);
    expect(features.avg).toBeGreaterThan(10);
    expect(features.avg).toBeLessThan(20);
    expect(features.std).toBeGreaterThan(0);
    // Sample size might be 29-30 depending on timestamp filtering
    expect(features.sampleSize).toBeGreaterThanOrEqual(29);
    expect(features.sampleSize).toBeLessThanOrEqual(30);
    expect(features.isNewRecipient).toBe(false);
    expect(features.zAmount).toBeLessThan(1); // Normal amount
  });

  it('should detect new recipient', () => {
    const history = generatePatternHistory('normal', FIXED_TIME);
    const candidate = {
      walletId: 'test-wallet',
      asset: 'XLM',
      amount: 15,
      to: 'GDSR...NEW_RECIPIENT',
      createdAt: new Date(FIXED_TIME).toISOString(),
    };

    const knownRecipients = extractKnownRecipients(history);
    const hourHist = generateHourHistogram(history);

    const context = {
      recentOut: history,
      hourHist,
      knownCounterparties: knownRecipients,
    };

    const features = extractFeatures(candidate, context);

    expect(features.isNewRecipient).toBe(true);
  });

  it('should detect off-hours transactions', () => {
    const history = generateWalletHistory({
      count: 30,
      meanAmount: 15,
      stdAmount: 5,
      startTime: FIXED_TIME,
      hourDistribution: 'daytime', // 9 AM - 6 PM
    });

    // Test at 3 AM (off-hours)
    const offHoursTime = new Date('2024-03-15T03:00:00.000Z');
    const candidate = {
      walletId: 'test-wallet',
      asset: 'XLM',
      amount: 15,
      to: 'GDSR...A',
      createdAt: offHoursTime.toISOString(),
    };

    const knownRecipients = extractKnownRecipients(history);
    const hourHist = generateHourHistogram(history);

    const context = {
      recentOut: history,
      hourHist,
      knownCounterparties: knownRecipients,
    };

    const features = extractFeatures(candidate, context);

    expect(features.offHours).toBe(true);
    expect(features.hourProb).toBeLessThan(0.05); // Very low probability
  });

  it('should handle empty history gracefully', () => {
    const candidate = {
      walletId: 'test-wallet',
      asset: 'XLM',
      amount: 100,
      to: 'GDSR...RECIPIENT',
      createdAt: new Date(FIXED_TIME).toISOString(),
    };

    const context = {
      recentOut: [],
      hourHist: new Array(24).fill(0),
      knownCounterparties: new Set<string>(),
    };

    const features = extractFeatures(candidate, context);

    expect(features.sampleSize).toBe(0);
    expect(features.isNewRecipient).toBe(true);
    expect(features.avg).toBe(0);
    expect(features.std).toBe(0);
    expect(Number.isFinite(features.zAmount)).toBe(true);
  });

  it('should compute robust Z-score when whale present', () => {
    const history = generatePatternHistory('whale', FIXED_TIME);

    const candidate = {
      walletId: 'test-wallet',
      asset: 'XLM',
      amount: 120, // Above normal but not whale-level
      to: 'GDSR...RECIPIENT',
      createdAt: new Date(FIXED_TIME).toISOString(),
    };

    const knownRecipients = extractKnownRecipients(history);
    const hourHist = generateHourHistogram(history);

    const context = {
      recentOut: history,
      hourHist,
      knownCounterparties: knownRecipients,
    };

    const features = extractFeatures(candidate, context);

    // Classical Z-score might be low due to whale skewing mean
    // But robust Z-score (using median/MAD) should be higher
    expect(features.zRobust).toBeGreaterThan(features.zAmount);
    expect(features.zRobust).toBeGreaterThan(3);
  });

  it('should detect frequency spike', () => {
    const history = generateWalletHistory({
      count: 30,
      meanAmount: 15,
      stdAmount: 5,
      startTime: FIXED_TIME,
      intervalMinutes: 1440, // 1 day normally
    });

    // Add 5 recent transactions in last 15 minutes
    const historyWithSpike = addTransactions(
      history,
      [
        { amount: 10, to: 'GDSR...A', hoursAgo: 0.1 },
        { amount: 12, to: 'GDSR...A', hoursAgo: 0.15 },
        { amount: 11, to: 'GDSR...A', hoursAgo: 0.2 },
        { amount: 13, to: 'GDSR...A', hoursAgo: 0.22 },
      ],
      FIXED_TIME,
    );

    const candidate = {
      walletId: 'test-wallet',
      asset: 'XLM',
      amount: 15,
      to: 'GDSR...A',
      createdAt: new Date(FIXED_TIME).toISOString(),
    };

    const knownRecipients = extractKnownRecipients(historyWithSpike);
    const hourHist = generateHourHistogram(historyWithSpike);

    const context = {
      recentOut: historyWithSpike,
      hourHist,
      knownCounterparties: knownRecipients,
    };

    const features = extractFeatures(candidate, context);

    expect(features.recentCount15m).toBeGreaterThanOrEqual(4);
    expect(features.freqSpikeRatio).toBeGreaterThan(3);
  });
});

describe('Risk Engine - Scoring', () => {
  it('should score normal transaction as low risk', () => {
    // Generate history during daytime hours to match candidate time
    const knownRecipient = 'GDSR...KNOWN';
    const history = generateWalletHistory({
      count: 30,
      meanAmount: 15,
      stdAmount: 5,
      startTime: FIXED_TIME,
      hourDistribution: 'daytime', // 9 AM - 6 PM
      recipients: [knownRecipient, 'GDSR...B'], // Include the recipient we'll use
    });
    
    const candidate = {
      walletId: 'test-wallet',
      asset: 'XLM',
      amount: 12, // Slightly below average, clearly normal
      to: knownRecipient, // Known recipient from history
      createdAt: new Date(FIXED_TIME).toISOString(), // 14:30 is during daytime
    };

    const knownRecipients = extractKnownRecipients(history);
    const hourHist = generateHourHistogram(history);

    const context = {
      recentOut: history,
      hourHist,
      knownCounterparties: knownRecipients,
    };

    const features = extractFeatures(candidate, context);
    const result = score(features);

    expect(result.bucket).toBe('low');
    expect(result.score).toBeLessThan(0.2);
    expect(result.decision).toBe('allow');
    // Should have no or minimal risk reasons since it's normal
    expect(result.reasons.length).toBeLessThanOrEqual(1);
  });

  it('should score large spike to known recipient as high risk', () => {
    const history = generatePatternHistory('normal', FIXED_TIME);
    
    const candidate = {
      walletId: 'test-wallet',
      asset: 'XLM',
      amount: 500, // Much larger than avg ~15
      to: 'GDSR...A', // Known recipient
      createdAt: new Date(FIXED_TIME).toISOString(),
    };

    const knownRecipients = extractKnownRecipients(history);
    const hourHist = generateHourHistogram(history);

    const context = {
      recentOut: history,
      hourHist,
      knownCounterparties: knownRecipients,
    };

    const features = extractFeatures(candidate, context);
    const result = score(features);

    expect(result.bucket).toBe('high');
    expect(result.score).toBeGreaterThanOrEqual(0.5);
    // Reasons contain the actual z-score value like "amount_outlier_z=96.7"
    const hasOutlierReason = result.reasons.some(r => r.startsWith('amount_outlier_z='));
    expect(hasOutlierReason).toBe(true);
    expect(result.factors).toHaveProperty('zAmount');
  });

  it('should score new recipient modest amount as medium/high', () => {
    const history = generateWalletHistory({
      count: 30,
      meanAmount: 50,
      stdAmount: 10,
      startTime: FIXED_TIME,
    });

    const candidate = {
      walletId: 'test-wallet',
      asset: 'XLM',
      amount: 80, // Slightly above average
      to: 'GDSR...NEW', // New recipient
      createdAt: new Date(FIXED_TIME).toISOString(),
    };

    const knownRecipients = extractKnownRecipients(history);
    const hourHist = generateHourHistogram(history);

    const context = {
      recentOut: history,
      hourHist,
      knownCounterparties: knownRecipients,
    };

    const features = extractFeatures(candidate, context);
    const result = score(features);

    expect(result.score).toBeGreaterThanOrEqual(0.2); // At least medium
    expect(result.reasons).toContain('new_recipient');
    expect(result.decision).not.toBe('allow');
  });

  it('should apply absolute cap backstop', () => {
    const history = generatePatternHistory('normal', FIXED_TIME);
    
    const candidate = {
      walletId: 'test-wallet',
      asset: 'XLM',
      amount: 600, // Above absolute cap of 500
      to: 'GDSR...A',
      createdAt: new Date(FIXED_TIME).toISOString(),
    };

    const knownRecipients = extractKnownRecipients(history);
    const hourHist = generateHourHistogram(history);

    const context = {
      recentOut: history,
      hourHist,
      knownCounterparties: knownRecipients,
    };

    const features = extractFeatures(candidate, context);
    const result = score(features);

    expect(result.bucket).toBe('high');
    expect(result.score).toBeGreaterThanOrEqual(0.6);
    // Check for huge_amount_backstop which triggers when amount > cap
    expect(result.reasons).toContain('huge_amount_backstop');
  });

  it('should force high risk for small sample size', () => {
    const history = generateWalletHistory({
      count: 5, // Small sample
      meanAmount: 20,
      stdAmount: 5,
      startTime: FIXED_TIME,
    });

    const candidate = {
      walletId: 'test-wallet',
      asset: 'XLM',
      amount: 70, // Much larger (3x average)
      to: 'GDSR...A',
      createdAt: new Date(FIXED_TIME).toISOString(),
    };

    const knownRecipients = extractKnownRecipients(history);
    const hourHist = generateHourHistogram(history);

    const context = {
      recentOut: history,
      hourHist,
      knownCounterparties: knownRecipients,
    };

    const features = extractFeatures(candidate, context);
    const result = score(features);

    // Small sample + large amount should trigger backstop
    expect(result.score).toBeGreaterThanOrEqual(0.6);
    expect(result.reasons).toContain('small_sample_backstop');
  });

  it('should apply p95 backstop', () => {
    const history = generatePatternHistory('normal', FIXED_TIME);
    
    const candidate = {
      walletId: 'test-wallet',
      asset: 'XLM',
      amount: 200, // Well above p95
      to: 'GDSR...A',
      createdAt: new Date(FIXED_TIME).toISOString(),
    };

    const knownRecipients = extractKnownRecipients(history);
    const hourHist = generateHourHistogram(history);

    const context = {
      recentOut: history,
      hourHist,
      knownCounterparties: knownRecipients,
    };

    const features = extractFeatures(candidate, context);
    const result = score(features);

    // Should trigger above_p95 reason or huge_amount_backstop
    const hasP95OrBackstop = result.reasons.includes('above_p95') || 
                             result.reasons.includes('huge_amount_backstop');
    expect(hasP95OrBackstop).toBe(true);
  });

  it('should block severe new recipient when configured', () => {
    // Note: BLOCK_SEVERE_NEW_RECIPIENT is false by default, need to test with it enabled
    const history = generatePatternHistory('normal', FIXED_TIME);
    
    const candidate = {
      walletId: 'test-wallet',
      asset: 'XLM',
      amount: 5000, // Very large
      to: 'GDSR...MALICIOUS', // New recipient
      createdAt: new Date(FIXED_TIME).toISOString(),
    };

    const knownRecipients = extractKnownRecipients(history);
    const hourHist = generateHourHistogram(history);

    const context = {
      recentOut: history,
      hourHist,
      knownCounterparties: knownRecipients,
    };

    const features = extractFeatures(candidate, context);
    
    // Test with BLOCK_SEVERE_NEW_RECIPIENT enabled
    const configWithBlock = {
      ...RISK_CONFIG,
      BLOCK_SEVERE_NEW_RECIPIENT: true,
    };
    const result = score(features, configWithBlock);

    expect(result.bucket).toBe('high');
    expect(result.decision).toBe('block');
    expect(result.reasons).toContain('severe_new_recipient_block');
  });

  it('should handle zero/NaN stats without crashing', () => {
    const candidate = {
      walletId: 'test-wallet',
      asset: 'XLM',
      amount: 100,
      to: 'GDSR...RECIPIENT',
      createdAt: new Date(FIXED_TIME).toISOString(),
    };

    const context = {
      recentOut: [],
      hourHist: new Array(24).fill(0),
      knownCounterparties: new Set<string>(),
    };

    const features = extractFeatures(candidate, context);
    const result = score(features);

    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.bucket).toBeTruthy();
    expect(result.decision).toBeTruthy();
  });
});
