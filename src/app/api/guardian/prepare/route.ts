import { NextResponse } from "next/server";
import { buildMedThresholdPayment } from "@/lib/xdr";
import { createPendingTx } from "@/lib/storage";
import { notifyTelegramRisk, isTelegramConfigured } from "@/lib/telegram";
import { explainFactors, normalizeFactors } from "@/lib/explain";
import { Features } from "@/lib/risk";

interface GuardianPrepareRequest {
  account?: string;
  tx?: {
    to?: string;
    amount?: number | string;
    asset?: string;
    assetIssuer?: string;
    memo?: string;
    ts?: string;
  };
  factors?: Partial<Features>;
  score?: number;
  reasons?: string[];
  telegramChatId?: number | string;
  summaryOverride?: string;
  ttlSeconds?: number;
}

const DEFAULT_TTL = 15 * 60; // 15 minutes

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as GuardianPrepareRequest;

    if (!payload.account || typeof payload.account !== "string") {
      throw new Error("account is required");
    }
    if (!payload.tx) {
      throw new Error("tx payload is required");
    }

    const { to, amount, asset, assetIssuer, memo, ts } = payload.tx;
    if (!to || typeof to !== "string") {
      throw new Error("tx.to is required");
    }
    if (!asset || typeof asset !== "string") {
      throw new Error("tx.asset is required");
    }
    const numericAmount =
      typeof amount === "number" ? amount : Number.parseFloat(String(amount));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error("tx.amount must be positive");
    }

    const normalizedFactors = normalizeFactors(payload.factors);
    const reasons = Array.isArray(payload.reasons)
      ? payload.reasons.filter(
          (entry): entry is string => typeof entry === "string" && entry.length > 0,
        )
      : [];

    const unsignedXdr = await buildMedThresholdPayment({
      source: payload.account,
      destination: to,
      amount: numericAmount.toString(),
      assetCode: asset !== "XLM" ? asset : undefined,
      assetIssuer: asset !== "XLM" ? assetIssuer : undefined,
      memo,
    });

    const ttl =
      payload.ttlSeconds && payload.ttlSeconds > 0 ? payload.ttlSeconds : DEFAULT_TTL;

    const entry = await createPendingTx({
      account: payload.account,
      unsignedXdr,
      ttlSeconds: ttl,
      factors: payload.factors,
    });

    if (isTelegramConfigured() || payload.telegramChatId) {
      try {
        const factorsForAlert: Array<{ name: string; value: number; description: string }> = [];

        if (normalizedFactors.new_recipient) {
          factorsForAlert.push({
            name: "new_recipient",
            value: 1,
            description: "New recipient address",
          });
        }
        if (normalizedFactors.z_amount >= 1) {
          factorsForAlert.push({
            name: "z_amount",
            value: normalizedFactors.z_amount,
            description: `Amount ${normalizedFactors.z_amount.toFixed(1)}x above normal`,
          });
        }
        if (normalizedFactors.off_hours) {
          factorsForAlert.push({
            name: "off_hours",
            value: 1,
            description: "Transaction outside typical hours",
          });
        }
        if (normalizedFactors.freq_spike_ratio > 1.5) {
          factorsForAlert.push({
            name: "freq_spike",
            value: normalizedFactors.freq_spike_ratio,
            description: `Activity spike ${normalizedFactors.freq_spike_ratio.toFixed(1)}x baseline`,
          });
        }
        if (normalizedFactors.recipient_concentration > 0.5) {
          factorsForAlert.push({
            name: "concentration",
            value: normalizedFactors.recipient_concentration,
            description: "Recent flow concentrated to one recipient",
          });
        }
        if (normalizedFactors.balance_ratio >= 0.4) {
          factorsForAlert.push({
            name: "balance_ratio",
            value: normalizedFactors.balance_ratio,
            description: `Sending ${Math.round(normalizedFactors.balance_ratio * 100)}% of current balance`,
          });
        }

        await notifyTelegramRisk({
          account: payload.account,
          recipient: to,
          amount: numericAmount.toString(),
          asset,
          score: payload.score || 0.75,
          factors: factorsForAlert,
          queueId: entry.txId,
        });
      } catch (err) {
        console.error("[guardian] Failed to send Telegram alert", err);
      }
    } else {
      console.log("[guardian] Telegram not configured, skipping notification");
    }

    return NextResponse.json({
      tx_id: entry.txId,
      expires_at: entry.expiresAt,
      unsigned_xdr: unsignedXdr,
      human_readable: explainFactors(normalizedFactors, {
        score: payload.score,
        reasons,
      }),
    });
  } catch (error) {
    console.error("Guardian prepare error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
