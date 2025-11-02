"use client";

import AppShell from "@/components/AppShell";
import TotpSetup from "@/components/TotpSetup";
import WalletConnection from "@/components/WalletConnection";

export default function SettingsPage() {
  return (
    <AppShell
      pageTitle="Settings"
      pageDescription="Configure guardian approvals, authentication, and integrations."
    >
      <div className="space-y-8">
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Account</h2>
            <p className="text-sm text-white/60">
              Manage the wallet connected to this Sentinel workspace.
            </p>
          </div>
          <WalletConnection />
        </section>

        <section className="space-y-4 max-w-3xl">
          <div>
            <h2 className="text-lg font-semibold text-white">Security &amp; Step-up Auth</h2>
            <p className="text-sm text-white/60">
              Require Google Authenticator codes for medium and high-risk transactions to keep your
              flows safe.
            </p>
          </div>
          <TotpSetup />
        </section>
      </div>
    </AppShell>
  );
}
