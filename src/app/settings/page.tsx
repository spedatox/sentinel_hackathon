"use client";

'use client';

import AppShell from '@/components/AppShell';
import TotpSetup from '@/components/TotpSetup';
import WalletConnection from '@/components/WalletConnection';
import { useLanguage } from '@/providers/LanguageProvider';

export default function SettingsPage() {
  const { t } = useLanguage();

  return (
    <AppShell
      pageTitle={t.settings.title}
      pageDescription={t.settings.description}
    >
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-white mb-2">{t.settings.accountTitle}</h2>
          <p className="text-gray-400 text-sm mb-4">
            {t.settings.accountDesc}
          </p>
          <WalletConnection />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">{t.settings.securityTitle}</h2>
          <p className="text-gray-400 text-sm mb-4">
            {t.settings.securityDesc}
          </p>
          <TotpSetup />
        </section>
      </div>
    </AppShell>
  );
}
