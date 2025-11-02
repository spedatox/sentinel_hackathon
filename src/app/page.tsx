"use client";

import AppShell from "@/components/AppShell";
import WalletConnection from "@/components/WalletConnection";
import BalanceDisplay from "@/components/BalanceDisplay";
import PaymentForm from "@/components/PaymentForm";
import TransactionHistory from "@/components/TransactionHistory";
import TelegramStatus from "@/components/TelegramStatus";
import { useWallet } from "@/providers/WalletProvider";

export default function Home() {
  const { publicKey } = useWallet();

  return (
    <AppShell
      pageTitle="Overview"
      pageDescription="Monitor your Stellar wallet posture, approvals, and recent activity."
    >
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
          Sentinel
        </p>
        <div className="mt-4 space-y-3">
          <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
            AI explains. Blockchain enforces.
          </h2>
          <p className="max-w-2xl text-sm text-white/70 md:text-base">
            Sentinel learns your wallet behaviour, flags deviations, and escalates risky transfers
            with step-up auth, guardian co-signatures, and Telegram approvals without touching
            private keys.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <WalletConnection />
          {publicKey && <BalanceDisplay publicKey={publicKey} />}
          <TelegramStatus status="idle" />
        </div>

        <div className="space-y-6">
          {publicKey ? (
            <>
              <PaymentForm publicKey={publicKey} />
              <TransactionHistory publicKey={publicKey} />
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-white/60">
              Connect a wallet to unlock Sentinel&apos;s risk engine, guardian workflows, and history
              insights.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
