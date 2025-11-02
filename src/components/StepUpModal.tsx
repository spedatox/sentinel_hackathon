"use client";

import { useEffect, useMemo, useState } from "react";
import type { RiskBucket } from "./RiskBadge";

interface StepUpModalProps {
  open: boolean;
  riskBucket: RiskBucket;
  score: number;
  publicKey?: string;
  onVerify: () => Promise<void> | void;
  onCancel: () => void;
}

const STEP_UP_CODE = "123123";

export default function StepUpModal({
  open,
  riskBucket,
  score,
  publicKey,
  onVerify,
  onCancel,
}: StepUpModalProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState<boolean | null>(null);

  const headline = useMemo(
    () => (riskBucket === "high" ? "Guardian approval required" : "Step-up verification required"),
    [riskBucket],
  );

  useEffect(() => {
    if (!open) {
      setCode("");
      setError(null);
      return;
    }
    
    // Check if TOTP is enabled for this account
    if (publicKey) {
      fetch('/api/auth/totp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: publicKey }),
      })
        .then((res) => res.json())
        .then((data) => setTotpEnabled(data.enabled))
        .catch(() => setTotpEnabled(false));
    }
  }, [open, publicKey]);

  if (!open) {
    return null;
  }

  const disabled = verifying;

  const handleVerify = async () => {
    if (disabled) return;
    
    try {
      setError(null);
      setVerifying(true);
      
      // If TOTP is enabled, verify via API
      if (totpEnabled && publicKey) {
        const response = await fetch('/api/auth/totp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account: publicKey, code: code.trim() }),
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.valid) {
          setError(data.message || "Invalid TOTP code from Google Authenticator");
          setVerifying(false);
          return;
        }
      } else {
        // Fall back to demo code
        if (code.trim() !== STEP_UP_CODE) {
          setError("Invalid code. Use 123123 for the demo or enable Google Authenticator.");
          setVerifying(false);
          return;
        }
      }
      
      await onVerify();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-slate-900/95 p-8 shadow-2xl">
        <h3 className="text-lg font-semibold uppercase tracking-wide text-slate-300">
          Risk score {(score * 100).toFixed(0)}%
        </h3>
        <h2 className="mt-1 text-2xl font-bold text-white">{headline}</h2>
        <p className="mt-3 text-sm text-slate-400">
          We detected unusual behavior and locked the send flow. Complete the step-up challenge to continue.
          {totpEnabled ? (
            <span className="block mt-2 text-cyan-300">
              🔐 Enter code from Google Authenticator
            </span>
          ) : (
            <span className="block mt-2">
              Use code <span className="font-mono text-slate-200">123123</span> for demo, or enable Google Authenticator in settings.
            </span>
          )}
        </p>

        <div className="mt-6 space-y-2">
          <label htmlFor="step-up-code" className="text-sm font-medium text-slate-200">
            One-time code
          </label>
          <input
            id="step-up-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            maxLength={6}
            className="w-full rounded-lg border border-white/20 bg-slate-950/60 px-4 py-3 font-mono text-lg tracking-[0.3em] text-white focus:border-cyan-400 focus:outline-none"
            placeholder="......"
          />
        </div>

        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleVerify}
            disabled={disabled}
            className={[
              "flex-1 rounded-lg border border-cyan-400/60 bg-cyan-500/10 px-6 py-3 font-semibold text-cyan-200 transition-all",
              disabled ? "opacity-50" : "hover:bg-cyan-500/20",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {verifying ? "Verifying..." : "Verify & Continue"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-white/15 px-6 py-3 font-semibold text-slate-200 transition-all hover:bg-white/5"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
