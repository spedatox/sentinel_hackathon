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
      href: "/app",
      label: t.sidebar.overview,
      icon: FiHome,
    },
  ];

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div
        className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
        onClick={closeSidebar}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-cyan-500/20 bg-gradient-to-b from-slate-950/95 to-slate-900/95 backdrop-blur-xl transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-screen flex-col gap-6 px-6 py-6 overflow-y-auto">
          <div className="flex items-center justify-between flex-shrink-0">
            <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
                <Image 
                  src="/sentinel_logo.png" 
                  alt="Sentinel Logo" 
                  width={48} 
                  height={48}
                  className="relative z-10 flex-shrink-0"
                />
              </div>
              <div>
                <span className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                  SENTINEL
                </span>
              </div>
            </Link>
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

          <nav className="space-y-2 flex-shrink-0">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-white border border-cyan-500/30 shadow-lg shadow-cyan-500/20"
                      : "text-white/60 hover:bg-white/5 hover:text-white hover:border hover:border-white/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-cyan-500/20 pt-6 flex-shrink-0">
            <Link
              href="/settings"
              onClick={closeSidebar}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-300 ${
                pathname === "/settings"
                  ? "bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-white border border-cyan-500/30 shadow-lg shadow-cyan-500/20"
                  : "text-white/60 hover:bg-white/5 hover:text-white hover:border hover:border-white/10"
              }`}
            >
              <FiSettings className="h-4 w-4" />
              {t.sidebar.settings}
            </Link>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col lg:ml-72 relative z-10">
        <header className="sticky top-0 z-20 border-b border-cyan-500/20 bg-gradient-to-r from-slate-950/95 to-slate-900/95 px-6 py-4 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 text-cyan-400 transition-all duration-300 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20 lg:hidden"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label="Toggle navigation"
            >
              <FiMenu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent md:text-2xl">
                {pageTitle}
              </h1>
              {pageDescription && (
                <p className="text-xs text-slate-400 md:text-sm">{pageDescription}</p>
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
