import type { CandidateTx, WalletContext, RiskFeatures } from './featureExtract';
import { extractFeatures } from './featureExtract';
import { RISK_CONFIG, type RiskConfig } from './config';
import type { RiskResult } from './score';
import { score } from './score';

export { RISK_CONFIG };
export type { CandidateTx, WalletContext, RiskFeatures, RiskResult };

export function evaluateRisk(candidate: CandidateTx, ctx: WalletContext, config: RiskConfig = RISK_CONFIG): RiskResult {
  const features = extractFeatures(candidate, ctx, config);
  return score(features, config);
}

