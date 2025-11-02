/**
 * Two-Factor Authentication (TOTP) Module
 * Supports Google Authenticator, Authy, Microsoft Authenticator, etc.
 */

import * as OTPAuth from 'otpauth';
import { getTotpSecret, saveTotpSecret } from './storage';

/**
 * Generate a new TOTP secret for an account
 * Returns secret and otpauth:// URL for QR code generation
 */
export function generateTotpSecret(account: string): { secret: string; uri: string } {
  const totp = new OTPAuth.TOTP({
    issuer: 'Sentinel Wallet',
    label: account,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  const secret = totp.secret.base32;
  const uri = totp.toString();

  return { secret, uri };
}

/**
 * Verify a TOTP code against stored secret
 * Allows 1 period (30s) window for clock drift
 */
export async function verifyTotpCode(account: string, code: string): Promise<boolean> {
  const storedSecret = await getTotpSecret(account);
  if (!storedSecret) {
    console.warn('[TOTP] No secret found for account:', account);
    return false;
  }

  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'Sentinel Wallet',
      label: account,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: storedSecret,
    });

    // Check current code and adjacent periods (±30s window)
    const delta = totp.validate({ token: code, window: 1 });
    
    if (delta !== null) {
      console.log('[TOTP] Code validated successfully');
      return true;
    }

    console.warn('[TOTP] Invalid code provided');
    return false;
  } catch (error) {
    console.error('[TOTP] Verification error:', error);
    return false;
  }
}

/**
 * Setup TOTP for an account
 * Saves secret to storage and returns QR code URI
 */
export async function setupTotp(account: string): Promise<{ secret: string; uri: string; qrUri: string }> {
  const { secret, uri } = generateTotpSecret(account);
  await saveTotpSecret(account, secret);

  // Generate QR code-ready URI
  const qrUri = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(uri)}`;

  console.log('[TOTP] Setup complete for account:', account);
  return { secret, uri, qrUri };
}

/**
 * Check if TOTP is enabled for an account
 */
export async function isTotpEnabled(account: string): Promise<boolean> {
  const secret = await getTotpSecret(account);
  return !!secret;
}

/**
 * Generate current TOTP code (for testing/display only)
 */
export async function getCurrentCode(account: string): Promise<string | null> {
  const storedSecret = await getTotpSecret(account);
  if (!storedSecret) return null;

  const totp = new OTPAuth.TOTP({
    issuer: 'Sentinel Wallet',
    label: account,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: storedSecret,
  });

  return totp.generate();
}
