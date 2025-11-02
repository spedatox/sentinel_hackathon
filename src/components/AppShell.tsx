"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  FiMenu,
  FiShield,
  FiSettings,
  FiHome,
  FiX,
} from "react-icons/fi";
import { useLanguage } from "@/providers/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";

type AppShellProps = {
  children: React.ReactNode;
  pageTitle: string;
  pageDescription?: string;
};

export default function AppShell({
  children,
  pageTitle,
  pageDescription,
}: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useLanguage();

  const NAV_ITEMS = [
    {
      href: "/",
      label: t.sidebar.overview,
      icon: FiHome,
    },
  ];

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <div
        className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
        onClick={closeSidebar}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-white/10 bg-slate-950/95 backdrop-blur-xl transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-screen flex-col gap-6 px-6 py-6 overflow-y-auto">
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <Image 
                src="/sentinel-logo.png" 
                alt="Sentinel Logo" 
                width={48} 
                height={48}
                className="flex-shrink-0"
              />
              <div>
                <span className="flex items-center gap-2 text-xl font-bold text-white">
                  SENTINEL
                </span>
                <p className="text-xs text-cyan-300">{t.sidebar.subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-white lg:hidden"
              onClick={closeSidebar}
              aria-label="Close navigation"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-shrink-0 w-fit">
            <LanguageToggle />
          </div>

          <nav className="space-y-1 flex-shrink-0">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                    isActive
                      ? "bg-white/10 text-white shadow-lg shadow-cyan-500/10"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-white/10 pt-6 flex-shrink-0">
            <Link
              href="/settings"
              onClick={closeSidebar}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                pathname === "/settings"
                  ? "bg-white/10 text-white shadow-lg shadow-cyan-500/10"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <FiSettings className="h-4 w-4" />
              {t.sidebar.settings}
            </Link>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col lg:ml-72">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 px-6 py-3 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/80 transition hover:border-white/20 hover:text-white lg:hidden"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label="Toggle navigation"
            >
              <FiMenu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
                {pageTitle}
              </h1>
              {pageDescription && (
                <p className="text-xs text-white/60 md:text-sm">{pageDescription}</p>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
