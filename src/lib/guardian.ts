import * as StellarSdk from '@stellar/stellar-sdk';

const SIGNER_URL = process.env.GUARDIAN_SIGNER_URL;
const GUARDIAN_SECRET_KEY = process.env.GUARDIAN_SECRET_KEY;

interface GuardianResponse {
  success: boolean;
  signed_xdr?: string;
  submitted?: boolean;
  hash?: string;
  error?: string;
}

/**
 * Check if Guardian is configured (either local key or external service)
 */
export function isGuardianConfigured(): boolean {
  return !!(GUARDIAN_SECRET_KEY || SIGNER_URL);
}

/**
 * Sign transaction with Guardian key for high-risk transactions
 * Uses local Guardian secret key if configured, otherwise falls back to external service
 */
export async function requestGuardianCosign(txId: string, unsignedXdr: string, riskLevel?: 'low' | 'medium' | 'high'): Promise<GuardianResponse> {
  // For high-risk transactions, Guardian signature is MANDATORY
  if (riskLevel === 'high' && !isGuardianConfigured()) {
    throw new Error('Guardian not configured. High-risk transactions require Guardian co-signature.');
  }

  // Use local Guardian key if available
  if (GUARDIAN_SECRET_KEY) {
    try {
      const guardianKeypair = StellarSdk.Keypair.fromSecret(GUARDIAN_SECRET_KEY);
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        unsignedXdr,
        process.env.NEXT_PUBLIC_NETWORK === 'public' 
          ? StellarSdk.Networks.PUBLIC 
          : StellarSdk.Networks.TESTNET
      );
      
      // Sign with Guardian key
      transaction.sign(guardianKeypair);
      
      console.log(`✅ Guardian signed transaction ${txId} (risk: ${riskLevel || 'unknown'})`);
      
      return {
        success: true,
        signed_xdr: transaction.toXDR(),
        submitted: false,
        hash: undefined,
      };
    } catch (error) {
      console.error('Guardian signing error:', error);
      throw new Error(`Guardian signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Fall back to external Guardian service
  if (SIGNER_URL) {
    const res = await fetch(`${SIGNER_URL.replace(/\/$/, "")}/cosign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tx_id: txId, unsigned_xdr: unsignedXdr, risk_level: riskLevel }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Guardian signer error: ${text}`);
    }

    return (await res.json()) as GuardianResponse;
  }

  // No Guardian configured - only allow for non-high-risk
  if (riskLevel === 'high') {
    throw new Error('Guardian signature required for high-risk transactions');
  }

  return {
    success: true,
    signed_xdr: unsignedXdr,
    submitted: false,
    hash: undefined,
  };
}
