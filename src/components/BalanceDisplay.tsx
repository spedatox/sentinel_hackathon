"use client";

import { useCallback, useEffect, useState } from "react";
import { FaCoins, FaSync } from "react-icons/fa";
import { type StellarHelper, getStellarHelper } from "@/lib/stellar-helper";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/providers/LanguageProvider";

interface BalanceDisplayProps {
  publicKey: string;
}

export default function BalanceDisplay({ publicKey }: BalanceDisplayProps) {
  const [stellar, setStellar] = useState<StellarHelper | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [assets, setAssets] = useState<Array<{ code: string; issuer: string; balance: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { t } = useLanguage();

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

  const fetchBalance = useCallback(async () => {
    if (!stellar) {
      return;
    }
    try {
      setRefreshing(true);
      const balanceData = await stellar.getBalance(publicKey);
      setBalance(balanceData.xlm);
      setAssets(balanceData.assets);
      setErrorMessage(null);
    } catch (error) {
      console.error("Error fetching balance:", error);
      let message = t.balance.errorGeneric;
      const code = (error as { code?: string })?.code;
      const isAccountMissing =
        code === "ACCOUNT_NOT_FOUND" ||
        (error instanceof Error &&
          (error.message === "ACCOUNT_NOT_FOUND" || /404/.test(error.message)));
      if (isAccountMissing) {
        message = t.balance.errorNotFound;
      }
      setErrorMessage(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [stellar, publicKey]);

  useEffect(() => {
    if (publicKey && stellar) {
      fetchBalance();
    }
  }, [publicKey, stellar, fetchBalance]);

  const formatBalance = (value: string): string => {
    const num = Number.parseFloat(value);
    if (Number.isNaN(num)) return "0.00";
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (!stellar || loading) {
    return (
      <Card>
        <div className="space-y-4">
          <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-12 w-2/3 animate-pulse rounded-2xl bg-white/5" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300">
            <FaCoins />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">{t.balance.title}</h2>
            <p className="text-sm text-white/60">{t.balance.subtitle}</p>
          </div>
        </div>
        <Button
          onClick={fetchBalance}
          disabled={refreshing}
          variant="secondary"
          leftIcon={<FaSync className={refreshing ? "animate-spin" : ""} />}
        >
          {refreshing ? t.balance.refreshing : t.balance.refresh}
        </Button>
      </div>

      <div className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-500/15 to-amber-500/5 p-6">
        <p className="text-xs uppercase tracking-wide text-white/50">{t.balance.available}</p>
        <p className="mt-3 text-5xl font-bold text-white">
          {formatBalance(balance)} <span className="text-2xl text-white/60">{t.balance.xlm}</span>
        </p>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          {errorMessage}
        </div>
      )}

      {assets.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-sm font-semibold text-white/70">{t.balance.otherAssets}</p>
          {assets.map((asset) => (
            <div
              key={`${asset.code}-${asset.issuer}`}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
            >
              <div>
                <p className="font-medium text-white">{asset.code}</p>
                <p className="text-xs text-white/40">{stellar.formatAddress(asset.issuer || "")}</p>
              </div>
              <p className="font-mono text-white">{formatBalance(asset.balance)}</p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-white/50">
        {t.balance.tip}
      </p>
    </Card>
  );
}
