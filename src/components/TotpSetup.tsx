"use client";

import { useCallback, useEffect, useState } from "react";
import { FaKey, FaQrcode, FaCheckCircle } from "react-icons/fa";
import { Card } from "./ui/card";
import { useWallet } from "@/providers/WalletProvider";

interface TotpSetupProps {
  publicKey?: string;
}

export default function TotpSetup({ publicKey: propPublicKey }: TotpSetupProps) {
  const { publicKey: contextPublicKey } = useWallet();
  const publicKey = propPublicKey ?? contextPublicKey ?? null;
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [setupComplete, setSetupComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  const checkStatus = useCallback(async () => {
    if (!publicKey) {
      return;
    }

    try {
      const response = await fetch('/api/auth/totp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: publicKey }),
      });
      const data = await response.json();
      setEnabled(data.enabled);
    } catch (err) {
      console.error('Failed to check TOTP status:', err);
    }
  }, [publicKey]);

  const handleSetup = async () => {
    if (!publicKey) {
      setError('Connect a wallet to enable Google Authenticator.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/totp/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: publicKey }),
      });

      if (!response.ok) {
        throw new Error('Setup failed');
      }

      const data = await response.json();
      setQrUri(data.qrUri);
      setSecret(data.secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!publicKey) {
      setError('Connect a wallet before verifying codes.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/totp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: publicKey, code: verifyCode }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        throw new Error(data.message || 'Invalid code');
      }

      setSetupComplete(true);
      setEnabled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Check status when the public key changes
  useEffect(() => {
    if (!publicKey) {
      setEnabled(null);
      setQrUri(null);
      setSecret(null);
      setSetupComplete(false);
      setVerifyCode("");
      setError(null);
      return;
    }

    checkStatus();
  }, [publicKey, checkStatus]);

  if (!publicKey) {
    return (
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <FaKey className="text-2xl text-cyan-400" />
          <h2 className="text-xl font-semibold text-white">Google Authenticator</h2>
        </div>
        <p className="text-sm text-slate-400">
          Connect a wallet to configure Google Authenticator approvals for medium and high-risk transactions.
        </p>
      </Card>
    );
  }

  if (enabled === null) {
    return (
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <FaKey className="text-2xl text-cyan-400" />
          <h2 className="text-xl font-semibold text-white">Google Authenticator</h2>
        </div>
        <p className="text-sm text-slate-400">Loading...</p>
      </Card>
    );
  }

  if (enabled && !setupComplete) {
    return (
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <FaCheckCircle className="text-2xl text-green-400" />
          <h2 className="text-xl font-semibold text-white">Google Authenticator Enabled</h2>
        </div>
        <p className="text-sm text-slate-300">
          This wallet now requires a 6-digit code for medium and high-risk transactions. Contact an administrator if you need to rotate devices.
        </p>
      </Card>
    );
  }

  if (setupComplete) {
    return (
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <FaCheckCircle className="text-2xl text-green-400" />
          <h2 className="text-xl font-semibold text-white">Setup Complete!</h2>
        </div>
        <p className="text-sm text-slate-300">
          Google Authenticator is now active. Medium and high-risk transactions will require a code from your app.
        </p>
        <button
          type="button"
          onClick={() => setSetupComplete(false)}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
        >
          Back to Settings
        </button>
      </Card>
    );
  }

  return (
    <Card className="space-y-6">
      <div className="flex items-center gap-3">
        <FaKey className="text-2xl text-cyan-400" />
        <h2 className="text-xl font-semibold text-white">Enable Google Authenticator</h2>
      </div>

      <p className="text-sm text-slate-400">
        Add an extra layer of security to medium and high-risk transactions. Works with Google Authenticator, Authy, Microsoft Authenticator, and other TOTP apps.
      </p>

      {!qrUri ? (
        <button
          type="button"
          onClick={handleSetup}
          disabled={loading}
          className="w-full rounded-lg border border-cyan-400/60 bg-cyan-500/10 px-6 py-3 font-semibold text-cyan-200 hover:bg-cyan-500/20"
        >
          {loading ? 'Generating...' : 'Setup Google Authenticator'}
        </button>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <FaQrcode className="text-cyan-400 text-xl" />
              <h3 className="font-semibold text-white">Step 1: Scan QR Code</h3>
            </div>
            
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUri}
              alt="TOTP QR Code"
              className="mx-auto rounded-lg border border-white/20"
            />
            
            <p className="mt-4 text-xs text-slate-400 text-center">
              Open Google Authenticator and scan this code
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="font-semibold text-white mb-2">Manual Entry (if QR fails)</h3>
            <p className="text-xs text-slate-400 mb-2">Secret Key:</p>
            <code className="block rounded bg-slate-950/60 px-3 py-2 text-xs text-cyan-300 font-mono break-all">
              {secret}
            </code>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <FaCheckCircle className="text-cyan-400 text-xl" />
              <h3 className="font-semibold text-white">Step 2: Verify Code</h3>
            </div>
            
            <p className="text-sm text-slate-400 mb-4">
              Enter the 6-digit code from your authenticator app to confirm setup:
            </p>

            <input
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full rounded-lg border border-white/20 bg-slate-950/60 px-4 py-3 font-mono text-lg tracking-[0.3em] text-white text-center focus:border-cyan-400 focus:outline-none"
            />

            <button
              type="button"
              onClick={handleVerify}
              disabled={loading || verifyCode.length !== 6}
              className="mt-4 w-full rounded-lg border border-cyan-400/60 bg-cyan-500/10 px-6 py-3 font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Complete Setup'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}
    </Card>
  );
}
