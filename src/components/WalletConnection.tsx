"use client";

import { useEffect, useState } from "react";
import { FaCheck, FaCopy, FaWallet, FaEye, FaEyeSlash } from "react-icons/fa";
import { MdLogout, MdSwapHoriz } from "react-icons/md";
import { type StellarHelper, getStellarHelper } from "@/lib/stellar-helper";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/providers/WalletProvider";
import { useLanguage } from "@/providers/LanguageProvider";

export default function WalletConnection() {
  const [stellar, setStellar] = useState<StellarHelper | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFullAddress, setShowFullAddress] = useState(false);
  const { publicKey, setPublicKey } = useWallet();
  const { t } = useLanguage();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const helper = getStellarHelper();
      setStellar(helper);
    } catch (error) {
      console.error("Failed to initialize Stellar helper:", error);
    }
  }, []);

  const isConnected = Boolean(publicKey);

  const handleConnect = async () => {
    try {
      if (!stellar) {
        throw new Error("Wallet helper not ready");
      }

      setConnecting(true);
      const key = await stellar.connectWallet();
      setPublicKey(key);
    } catch (error) {
      console.error("Connection error:", error);
      const message =
        error instanceof Error ? error.message : "Wallet connection failed";
      alert(message);
    } finally {
      setConnecting(false);
    }
  };

  const handleChangeWallet = async () => {
    stellar?.disconnect();
    setPublicKey(null);

    try {
      if (!stellar) {
        throw new Error("Wallet helper not ready");
      }

      setConnecting(true);
      const key = await stellar.connectWallet();
      setPublicKey(key);
    } catch (error) {
      console.error("Connection error:", error);
      const message =
        error instanceof Error ? error.message : "Wallet connection failed";
      alert(message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    stellar?.disconnect();
    setPublicKey(null);
  };

  const handleCopy = async () => {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!stellar) {
    return (
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl text-white">
              <FaWallet />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">{t.wallet.title}</h2>
              <p className="text-sm text-white/60">{t.wallet.loading}</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 text-xl text-cyan-300 shadow-lg shadow-cyan-500/20">
              <FaWallet />
            </div>
            <div>
              <h2 className="text-2xl font-semibold bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">{t.wallet.title}</h2>
              <p className="text-sm text-white/60">
                {t.wallet.description}
              </p>
            </div>
          </div>

          <Button
            onClick={handleConnect}
            disabled={connecting}
            fullWidth
            leftIcon={<FaWallet />}
            className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-400/40 hover:from-cyan-500/30 hover:to-purple-500/30"
          >
            {connecting ? t.wallet.connecting : t.wallet.connectButton}
          </Button>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 text-xs text-white/60">
            {t.wallet.fundingNote}{" "}
            <a
              href="https://laboratory.stellar.org/#account-creator?network=test"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-300 underline hover:text-cyan-200 transition"
            >
              Stellar Laboratory
            </a>{" "}
            {t.wallet.fundingNote2}
          </div>
        </div>
      </Card>
    );
  }

  const address = publicKey ?? "";
  
  const concealedAddress = address
    ? `${address.slice(0, 4)}${"•".repeat(40)}${address.slice(-4)}`
    : "";

  return (
    <Card className="relative overflow-hidden">
      {/* Gradient background for connected state */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-sm text-emerald-300">
            <span className="h-3 w-3 rounded-full bg-emerald-300 shadow-lg shadow-emerald-500/50 animate-pulse" />
            {t.wallet.connected}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleChangeWallet}
              disabled={connecting}
              className="flex items-center gap-2 text-sm text-cyan-300 transition hover:text-cyan-200 disabled:opacity-50"
            >
              <MdSwapHoriz /> {t.wallet.change}
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              className="flex items-center gap-2 text-sm text-rose-300 transition hover:text-rose-200"
            >
              <MdLogout /> {t.wallet.disconnect}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wide text-white/40">
              {t.wallet.publicKey}
            </p>
            <button
              type="button"
              onClick={() => setShowFullAddress(!showFullAddress)}
              className="flex items-center gap-1 text-xs text-cyan-300 transition hover:text-cyan-200"
              aria-label={showFullAddress ? t.wallet.hide : t.wallet.show}
            >
              {showFullAddress ? (
                <>
                  <FaEyeSlash className="text-sm" /> {t.wallet.hide}
                </>
              ) : (
                <>
                  <FaEye className="text-sm" /> {t.wallet.show}
                </>
              )}
            </button>
          </div>
          <p className="break-all font-mono text-sm text-white/90">
            {showFullAddress ? address : concealedAddress}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleCopy}
            variant="secondary"
            leftIcon={copied ? <FaCheck /> : <FaCopy />}
          >
            {copied ? t.wallet.copied : t.wallet.copyAddress}
          </Button>
          <a
            href={stellar.getExplorerLink(address, "account")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-300 underline transition hover:text-cyan-200"
          >
            {t.wallet.viewExplorer}
          </a>
        </div>
      </div>
    </Card>
  );
}
