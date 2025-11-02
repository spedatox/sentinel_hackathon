"use client";

import { useEffect, useState } from "react";
import { FaCheck, FaCopy, FaWallet } from "react-icons/fa";
import { MdLogout, MdSwapHoriz } from "react-icons/md";
import { type StellarHelper, getStellarHelper } from "@/lib/stellar-helper";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/providers/WalletProvider";

export default function WalletConnection() {
  const [stellar, setStellar] = useState<StellarHelper | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const { publicKey, setPublicKey } = useWallet();

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
              <h2 className="text-2xl font-semibold text-white">Connect wallet</h2>
              <p className="text-sm text-white/60">Loading wallet tools...</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl text-white">
              <FaWallet />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">Connect wallet</h2>
              <p className="text-sm text-white/60">
                Use Freighter or any WalletConnect-compatible wallet on Stellar
                Testnet.
              </p>
            </div>
          </div>

          <Button
            onClick={handleConnect}
            disabled={connecting}
            fullWidth
            leftIcon={<FaWallet />}
          >
            {connecting ? "Opening wallet..." : "Connect wallet"}
          </Button>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
            Need funds? Visit{" "}
            <a
              href="https://laboratory.stellar.org/#account-creator?network=test"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-300 underline"
            >
              Stellar Laboratory
            </a>{" "}
            after connecting to fund your Testnet account.
          </div>
        </div>
      </Card>
    );
  }

  const address = publicKey ?? "";

  return (
    <Card>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-sm text-emerald-300">
            <span className="h-3 w-3 rounded-full bg-emerald-300" />
            Connected
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleChangeWallet}
              disabled={connecting}
              className="flex items-center gap-2 text-sm text-cyan-300 transition hover:text-cyan-200 disabled:opacity-50"
            >
              <MdSwapHoriz /> Change
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              className="flex items-center gap-2 text-sm text-rose-300 transition hover:text-rose-200"
            >
              <MdLogout /> Disconnect
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wide text-white/40">
            Public key
          </p>
          <p className="mt-2 break-all font-mono text-sm text-white/90">
            {address}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleCopy}
            variant="secondary"
            leftIcon={copied ? <FaCheck /> : <FaCopy />}
          >
            {copied ? "Copied" : "Copy address"}
          </Button>
          <a
            href={stellar.getExplorerLink(address, "account")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-300 underline transition hover:text-cyan-200"
          >
            View on Stellar Expert
          </a>
        </div>
      </div>
    </Card>
  );
}
