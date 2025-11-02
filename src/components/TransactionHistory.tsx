"use client";

import { useEffect, useState } from "react";
import { FaArrowDown, FaArrowUp, FaExternalLinkAlt, FaHistory, FaSync } from "react-icons/fa";
import type { Features } from "@/lib/risk";
import { type StellarHelper, getStellarHelper } from "@/lib/stellar-helper";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RiskBadge, { type RiskBucket } from "./RiskBadge";
import InsightsDrawer from "./InsightsDrawer";

interface Transaction {
  id: string;
  type: string;
  amount?: string;
  asset?: string;
  from?: string;
  to?: string;
  createdAt: string;
  hash: string;
}

interface RiskSummary {
  bucket: RiskBucket;
  score: number;
  factors: Features;
  explanation?: string;
}

interface TransactionHistoryProps {
  publicKey: string;
}

const HISTORY_LIMIT = 10;

async function fetchRiskForTransaction(account: string, tx: Transaction): Promise<RiskSummary | null> {
  if (!tx.amount || !tx.to || !tx.createdAt) {
    return null;
  }
  const amount = Number.parseFloat(tx.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const response = await fetch("/api/risk/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account,
      tx: {
        to: tx.to,
        amount,
        asset: tx.asset || "XLM",
        ts: tx.createdAt,
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    bucket: RiskBucket;
    score: number;
    factors: Features;
  };

  return {
    bucket: payload.bucket,
    score: payload.score,
    factors: payload.factors,
  };
}

export default function TransactionHistory({ publicKey }: TransactionHistoryProps) {
  const [stellar, setStellar] = useState<StellarHelper | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [riskByTx, setRiskByTx] = useState<Record<string, RiskSummary>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

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

  const fetchTransactions = async () => {
    if (!stellar) {
      return;
    }
    try {
      setRefreshing(true);
      const txs = await stellar.getRecentTransactions(publicKey, HISTORY_LIMIT);
      setTransactions(txs);

      const riskEntries = await Promise.all(
        txs.map((tx) =>
          tx.from === publicKey ? fetchRiskForTransaction(publicKey, tx) : Promise.resolve(null),
        ),
      );

      const nextRisk: Record<string, RiskSummary> = {};
      txs.forEach((tx, index) => {
        const risk = riskEntries[index];
        if (risk) {
          nextRisk[tx.id] = risk;
        }
      });
      setRiskByTx(nextRisk);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (publicKey && stellar) {
      fetchTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, stellar]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const formatAddress = (address?: string): string => {
    if (!address) return "N/A";
    return stellar ? stellar.formatAddress(address, 4, 4) : address;
  };

  const isOutgoing = (tx: Transaction): boolean => tx.from === publicKey;

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-white/60">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-2xl">
        *
      </div>
      <p className="text-sm font-semibold text-white">No transactions yet</p>
      <p className="mt-1 text-xs text-white/50">
        Once this wallet sends or receives payments, Sentinel will display them here with risk tags.
      </p>
    </div>
  );

  const openInsights = async (tx: Transaction) => {
    const risk = riskByTx[tx.id];
    if (!risk) {
      return;
    }
    setSelectedTxId(tx.id);
    setDrawerOpen(true);

    if (risk.explanation) {
      return;
    }

    try {
      setInsightLoading(true);
      const response = await fetch("/api/risk/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factors: risk.factors,
          score: risk.score,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch explanation");
      }
      const data = await response.json();
      setRiskByTx((prev) => ({
        ...prev,
        [tx.id]: {
          ...prev[tx.id],
          explanation: data.text,
        },
      }));
    } catch (error) {
      console.error("Failed to load explanation", error);
    } finally {
      setInsightLoading(false);
    }
  };

  const selectedRisk = selectedTxId ? riskByTx[selectedTxId] : null;
  const selectedTx = selectedTxId ? transactions.find((tx) => tx.id === selectedTxId) : null;

  const Header = () => (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-300">
          <FaHistory />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Transaction history</h2>
          <p className="text-sm text-white/60">Sentinel re-scores each outgoing payment in context.</p>
        </div>
      </div>
      <Button
        onClick={fetchTransactions}
        disabled={refreshing}
        variant="secondary"
        leftIcon={<FaSync className={refreshing ? "animate-spin" : ""} />}
      >
        Refresh
      </Button>
    </div>
  );

  if (!stellar || loading) {
    return (
      <Card>
        <Header />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Header />

        {transactions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const outgoing = isOutgoing(tx);
              const risk = riskByTx[tx.id];

              return (
                <div
                  key={tx.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-white/20 hover:bg-white/10"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={[
                          "flex h-11 w-11 items-center justify-center rounded-full text-lg",
                          outgoing
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-emerald-500/20 text-emerald-300",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {outgoing ? <FaArrowUp /> : <FaArrowDown />}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{outgoing ? "Sent" : "Received"}</p>
                        {tx.amount && (
                          <p
                            className={[
                              "text-lg font-bold",
                              outgoing ? "text-rose-300" : "text-emerald-300",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            {outgoing ? "-" : "+"}
                            {Number.parseFloat(tx.amount).toFixed(2)} {tx.asset || "XLM"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {risk && (
                        <RiskBadge
                          bucket={risk.bucket}
                          size="sm"
                          onClick={() => openInsights(tx)}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => risk && openInsights(tx)}
                        disabled={!risk}
                        className={[
                          "text-xs underline transition-colors",
                          risk
                            ? "text-cyan-300 hover:text-cyan-200"
                            : "cursor-not-allowed text-white/30",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        Explain
                      </button>
                      <a
                        href={stellar ? stellar.getExplorerLink(tx.hash, "tx") : "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-cyan-300 transition-colors hover:text-cyan-200"
                      >
                        Details <FaExternalLinkAlt className="text-xs" />
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm text-white/70">
                    <div>
                      <p className="mb-1 text-xs text-white/40">From</p>
                      <p className="font-mono">{formatAddress(tx.from)}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-white/40">To</p>
                      <p className="font-mono">{formatAddress(tx.to)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs text-white/50">
                    <p>{formatDate(tx.createdAt)}</p>
                    <p className="font-mono">{tx.hash.slice(0, 12)}...</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {transactions.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-white/50">
              Showing last {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </Card>

      {selectedTx && selectedRisk && (
        <InsightsDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          bucket={selectedRisk.bucket}
          explanation={
            selectedRisk.explanation ||
            (insightLoading ? "Loading explanation..." : "Explanation unavailable.")
          }
          factors={selectedRisk.factors}
        />
      )}
    </>
  );
}
