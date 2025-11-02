"use client";

import AppShell from "@/components/AppShell";
import WalletConnection from "@/components/WalletConnection";
import BalanceDisplay from "@/components/BalanceDisplay";
import PaymentForm from "@/components/PaymentForm";
import TransactionHistory from "@/components/TransactionHistory";
import { useWallet } from "@/providers/WalletProvider";
import { useLanguage } from "@/providers/LanguageProvider";

export default function AppPage() {
  const { publicKey } = useWallet();
  const { t } = useLanguage();

  return (
    <AppShell
      pageTitle={t.page.title}
      pageDescription={t.page.description}
    >
      {/* Hero Section - Compact */}
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 lg:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
          Sentinel
        </p>
        <div className="mt-2 space-y-2">
          <h2 className="text-2xl font-semibold leading-tight md:text-3xl">
            {t.hero.title}
          </h2>
          <p className="max-w-2xl text-xs text-white/70 md:text-sm">
            {t.hero.description}
          </p>
        </div>
      </section>

      {/* Main Layout - Two Column with Sticky Sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left: Main Content */}
        <div className="space-y-6">
          {publicKey ? (
            <>
              <PaymentForm publicKey={publicKey} />
              <TransactionHistory publicKey={publicKey} />
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-white/60">
              {t.connect.message}
            </div>
          )}
        </div>

        {/* Right: Sticky Sidebar */}
        <div className="lg:sticky lg:top-24 lg:h-fit space-y-6">
          <WalletConnection />
          {publicKey && <BalanceDisplay publicKey={publicKey} />}
        </div>
      </div>
    </AppShell>
  );
}
