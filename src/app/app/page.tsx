"use client";

import AppShell from "@/components/AppShell";
import WalletConnection from "@/components/WalletConnection";
import BalanceDisplay from "@/components/BalanceDisplay";
import PaymentForm from "@/components/PaymentForm";
import TransactionHistory from "@/components/TransactionHistory";
import { useWallet } from "@/providers/WalletProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { FiShield, FiActivity, FiZap, FiCheckCircle } from "react-icons/fi";

export default function AppPage() {
  const { publicKey } = useWallet();
  const { t } = useLanguage();

  return (
    <AppShell
      pageTitle={t.page.title}
      pageDescription={t.page.description}
    >
      {/* Hero Section with Gradient Background */}
      <section className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-indigo-500/5 backdrop-blur-sm p-8 lg:p-10 hover:scale-[1.01] transition-all duration-300">
        {/* Animated Background Orbs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <FiShield className="text-cyan-400 text-2xl" />
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
              Sentinel Dashboard
            </p>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-cyan-200 to-indigo-200 bg-clip-text text-transparent mb-3">
            {t.hero.title}
          </h2>
          <p className="max-w-2xl text-sm text-white/70 leading-relaxed">
            {t.hero.description}
          </p>
        </div>
      </section>

      {/* Main Layout - Two Column with Sticky Sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left: Main Content */}
        <div className="space-y-6">
          {publicKey ? (
            <>
              <PaymentForm publicKey={publicKey} />
              <TransactionHistory publicKey={publicKey} />
            </>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-dashed border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-indigo-500/5 backdrop-blur-sm p-16 text-center hover:scale-[1.01] transition-all duration-300">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <FiShield className="mx-auto text-6xl text-cyan-400/50 mb-4" />
                <p className="text-white/70 text-lg max-w-md mx-auto leading-relaxed">
                  {t.connect.message}
                </p>
              </div>
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
