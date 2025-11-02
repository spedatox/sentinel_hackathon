"use client";

import { useEffect, useState } from "react";
import { FaPaperPlane, FaCheckCircle } from "react-icons/fa";
import { type StellarHelper, getStellarHelper } from "@/lib/stellar-helper";
import type { Features } from "@/lib/risk";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import RiskBadge from "./RiskBadge";
import StepUpModal from "./StepUpModal";
import TelegramStatus from "./TelegramStatus";

interface RiskResponse {
  score: number;
  bucket: "low" | "medium" | "high";
  factors: Features;
  reasons: string[];
  historySampleSize: number;
}

interface PendingTxContext {
  to: string;
  amount: string;
  memo?: string;
  asset: string;
  ts: string;
}

type TelegramState = "idle" | "waiting" | "approved" | "error";

interface PaymentFormProps {
  publicKey: string;
  onSuccess?: () => void;
}

export default function PaymentForm({ publicKey, onSuccess }: PaymentFormProps) {
  const [stellar, setStellar] = useState<StellarHelper | null>(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ recipient?: string; amount?: string }>({});
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [txHash, setTxHash] = useState("");
  const [riskResult, setRiskResult] = useState<RiskResponse | null>(null);
  const [riskExplanation, setRiskExplanation] = useState<string | null>(null);
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [pendingTx, setPendingTx] = useState<PendingTxContext | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<TelegramState>("idle");
  const [guardianTxId, setGuardianTxId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      setStellar(getStellarHelper());
    } catch (error) {
      console.error("Failed to initialize Stellar helper:", error);
    }
  }, []);

  const validateForm = (): boolean => {
    const newErrors: { recipient?: string; amount?: string } = {};

    if (!recipient.trim()) {
      newErrors.recipient = "Recipient address is required";
    } else if (recipient.length !== 56 || !recipient.startsWith("G")) {
      newErrors.recipient = "Invalid Stellar address (must start with G and be 56 characters).";
    }

    if (!amount.trim()) {
      newErrors.amount = "Amount is required";
    } else {
      const numAmount = Number.parseFloat(amount);
      if (Number.isNaN(numAmount) || numAmount <= 0) {
        newErrors.amount = "Amount must be a positive number.";
      } else if (numAmount < 0.0000001) {
        newErrors.amount = "Amount is too small (minimum 0.0000001 XLM).";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setRecipient("");
    setAmount("");
    setMemo("");
    setErrors({});
  };

  const executeSend = async (tx: PendingTxContext) => {
    try {
      setLoading(true);
      if (!stellar) {
        throw new Error("Wallet helper not ready");
      }

      const result = await stellar.sendPayment({
        from: publicKey,
        to: tx.to,
        amount: tx.amount,
        memo: tx.memo || undefined,
      });

      if (result.success) {
        setTxHash(result.hash);
        
        // Send Telegram notification for low-risk transaction
        try {
          await fetch("/api/telegram/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              account: publicKey,
              recipient: tx.to,
              amount: tx.amount,
              asset: tx.asset || "XLM",
              tx_hash: result.hash,
              risk_score: riskResult?.score || 0,
              risk_level: "low",
            }),
          });
        } catch (notifyError) {
          console.error("Failed to send Telegram notification:", notifyError);
        }
        
        setAlert({
          type: "success",
          message: "Payment sent successfully.",
        });
        resetForm();
        setRiskResult(null);
        setRiskExplanation(null);
        setPendingTx(null);
        setTelegramStatus("idle");
        setGuardianTxId(null);
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: unknown) {
      console.error("Payment error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected error while sending payment.";

      setAlert({
        type: "error",
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  const prepareGuardian = async (tx: PendingTxContext) => {
    try {
      if (!stellar) {
        throw new Error("Wallet helper not ready");
      }
      setLoading(true);
      setTelegramStatus("waiting");
      const response = await fetch("/api/guardian/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: publicKey,
          tx: {
            to: tx.to,
            amount: Number.parseFloat(tx.amount),
            asset: tx.asset,
            memo: tx.memo,
            ts: tx.ts,
          },
          factors: riskResult?.factors,
          score: riskResult?.score,
          reasons: riskResult?.reasons,
        }),
      });

      if (!response.ok) {
        const details = await response.json();
        throw new Error(details.error || "Guardian prepare failed");
      }

      const data = await response.json();
      setGuardianTxId(data.tx_id);
      
      setAlert({
        type: "success",
        message: "✅ TOTP verified. Processing transaction...",
      });

      // Automatically approve and submit (Telegram is just for notifications)
      const approveResponse = await fetch("/api/guardian/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tx_id: data.tx_id,
        }),
      });

      if (!approveResponse.ok) {
        const details = await approveResponse.json();
        throw new Error(details.error || "Guardian approval failed");
      }

      const approveData = await approveResponse.json();
      setTelegramStatus("approved");
      
      // If transaction needs user signature, sign it in wallet and submit
      if (approveData.needs_user_signature && approveData.xdr_to_sign) {
        const signResult = await stellar.signAndSubmitXDR(approveData.xdr_to_sign);
        
        if (signResult.success && signResult.hash) {
          setTxHash(signResult.hash);
          const riskLevel = riskResult?.bucket || 'unknown';
          setAlert({
            type: "success",
            message: `🎉 Transaction submitted! Hash: ${signResult.hash.slice(0, 16)}...${riskLevel === 'high' ? ' (Guardian multisig)' : ''}`,
          });
        } else {
          throw new Error('Failed to submit transaction');
        }
      } else {
        // Transaction was submitted by backend
        const riskLevel = riskResult?.bucket || 'unknown';
        const message = approveData.tx_hash
          ? `🎉 Transaction submitted! Hash: ${approveData.tx_hash.slice(0, 16)}...${riskLevel === 'high' ? ' (Guardian multisig)' : ''}`
          : "✅ Transaction processed successfully!";
        
        setAlert({
          type: "success",
          message,
        });
      }

      // Reset form
      setRecipient("");
      setAmount("");
      setMemo("");
      setPendingTx(null);
      setRiskResult(null);
    } catch (error: unknown) {
      console.error("Guardian prepare error:", error);
      const message =
        error instanceof Error ? error.message : "Guardian approval failed to start.";
      setTelegramStatus("error");
      setAlert({
        type: "error",
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStepUpVerify = async () => {
    console.log('🔐 TOTP verified, risk bucket:', riskResult?.bucket);
    if (!pendingTx || !riskResult) return;
    setStepUpOpen(false);

    // Both medium and high risk require Telegram guardian approval
    if (riskResult.bucket === "medium" || riskResult.bucket === "high") {
      console.log('📤 Calling prepareGuardian for', riskResult.bucket, 'risk');
      await prepareGuardian(pendingTx);
    } else {
      console.log('ℹ️ Low risk - no guardian needed, sending directly');
    }
  };

  const simulateGuardianApprove = async () => {
    if (!guardianTxId || !pendingTx) return;
    try {
      if (!stellar) {
        throw new Error("Wallet helper not ready");
      }
      setLoading(true);
      const response = await fetch("/api/guardian/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tx_id: guardianTxId,
        }),
      });

      if (!response.ok) {
        const details = await response.json();
        throw new Error(details.error || "Guardian approval failed");
      }

      setTelegramStatus("approved");
      setAlert({
        type: "success",
        message: "Guardian approval recorded. Sending now.",
      });
      await executeSend(pendingTx);
    } catch (error: unknown) {
      console.error("Guardian approve error:", error);
      const message =
        error instanceof Error ? error.message : "Guardian approval failed.";
      setTelegramStatus("error");
      setAlert({
        type: "error",
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      if (!stellar) {
        throw new Error("Wallet helper not ready");
      }
      setLoading(true);
      setAlert(null);
      setTxHash("");
      setGuardianTxId(null);
      setTelegramStatus("idle");

      const amountValue = Number.parseFloat(amount);
      const txContext: PendingTxContext = {
        to: recipient,
        amount: amountValue.toString(),
        memo: memo || undefined,
        asset: "XLM",
        ts: new Date().toISOString(),
      };

      // Get current balance for balance ratio calculation
      let accountBalance: number | undefined;
      try {
        const balanceData = await stellar?.getBalance(publicKey);
        if (balanceData?.xlm) {
          accountBalance = parseFloat(balanceData.xlm);
        }
      } catch (err) {
        console.warn('Could not fetch balance for risk calculation:', err);
      }

      const riskResponse = await fetch("/api/risk/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: publicKey,
          account_balance: accountBalance,
          tx: {
            to: txContext.to,
            amount: amountValue,
            asset: txContext.asset,
            ts: txContext.ts,
          },
        }),
      });

      if (!riskResponse.ok) {
        const details = await riskResponse.json();
        throw new Error(details.error || "Risk service failed");
      }

      const riskPayload = (await riskResponse.json()) as RiskResponse;
      setRiskResult(riskPayload);
      setPendingTx(txContext);

      const explainResponse = await fetch("/api/risk/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factors: riskPayload.factors,
          score: riskPayload.score,
          reasons: riskPayload.reasons,
        }),
      });
      if (explainResponse.ok) {
        const data = await explainResponse.json();
        setRiskExplanation(data.text);
      }

      if (riskPayload.bucket === "low") {
        await executeSend(txContext);
      } else {
        setAlert({
          type: "error",
          message:
            riskPayload.bucket === "medium"
              ? "Medium risk detected. Complete step-up verification."
              : "High risk detected. Guardian approval required.",
        });
        setStepUpOpen(true);
      }
    } catch (error: unknown) {
      console.error("Payment flow error:", error);
      const message =
        error instanceof Error ? error.message : "Unexpected error while processing payment.";
      setAlert({
        type: "error",
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!stellar) {
    return (
      <Card className="space-y-6">
        <header className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-300">
            <FaPaperPlane />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">Send payment</h2>
            <p className="text-sm text-white/60">Initializing wallet tools...</p>
          </div>
        </header>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          Loading wallet helper. Please wait.
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-300">
          <FaPaperPlane />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Send payment</h2>
          <p className="text-sm text-white/60">Sentinel analyses every transfer before it leaves.</p>
        </div>
      </header>

      {riskResult && (
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <RiskBadge bucket={riskResult.bucket} />
            <p className="text-xs text-white/50">
              Score {riskResult.score.toFixed(2)} | history {riskResult.historySampleSize}
            </p>
          </div>
          {riskExplanation && <p className="text-sm text-white/70">{riskExplanation}</p>}
        </div>
      )}

      {alert && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      {txHash && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <div className="flex items-start gap-3 text-sm text-white/80">
            <FaCheckCircle className="mt-1 text-lg text-emerald-300" />
            <div>
              <p className="font-semibold text-emerald-200">Transaction confirmed</p>
              <p className="mt-2 text-xs text-white/60">Hash</p>
              <p className="mt-1 break-all font-mono text-xs text-white/90">{txHash}</p>
              <a
                href={stellar.getExplorerLink(txHash, "tx")}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center text-xs text-cyan-300 underline"
              >
                View on Stellar Expert
              </a>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Recipient address"
          placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
          error={errors.recipient}
        />

        <Input
          label="Amount (XLM)"
          type="number"
          min="0"
          step="any"
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={errors.amount}
        />

        <Input
          label="Memo (optional)"
          placeholder="Payment for..."
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
        />

        <Button type="submit" disabled={loading} fullWidth leftIcon={!loading ? <FaPaperPlane /> : undefined}>
          {loading ? "Processing..." : "Send payment"}
        </Button>
      </form>

      {riskResult?.bucket === "high" && (
        <div className="space-y-3">
          <TelegramStatus
            status={telegramStatus}
            txId={guardianTxId || undefined}
            message={
              telegramStatus === "waiting"
                ? "Check Telegram alert and approve to continue."
                : undefined
            }
          />
          {guardianTxId && (
            <Button
              onClick={simulateGuardianApprove}
              variant="secondary"
              disabled={loading}
              fullWidth
            >
              Simulate Telegram Approve
            </Button>
          )}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
        Always double-check the recipient address before sending. Transactions on-chain are
        irreversible.
      </div>

      {riskResult && pendingTx && (
        <StepUpModal
          open={stepUpOpen}
          riskBucket={riskResult.bucket}
          score={riskResult.score}
          publicKey={publicKey}
          onVerify={handleStepUpVerify}
          onCancel={() => {
            setStepUpOpen(false);
            setPendingTx(null);
          }}
        />
      )}
    </Card>
  );
}
