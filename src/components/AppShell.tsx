"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiMenu,
  FiShield,
  FiSettings,
  FiHome,
  FiX,
} from "react-icons/fi";

type AppShellProps = {
  children: React.ReactNode;
  pageTitle: string;
  pageDescription?: string;
};

const NAV_ITEMS = [
  {
    href: "/",
    label: "Overview",
    icon: FiHome,
  },
];

export default function AppShell({
  children,
  pageTitle,
  pageDescription,
}: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-white/10 bg-slate-950/80 backdrop-blur-xl transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col gap-8 px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
                Sentinel
              </p>
              <span className="mt-1 flex items-center gap-2 text-lg font-semibold text-white">
                <FiShield className="text-cyan-300" />
                Guardian Console
              </span>
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

          <nav className="space-y-1">
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

          <div className="mt-auto border-t border-white/10 pt-6">
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
              Settings
            </Link>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 px-6 py-4 backdrop-blur-xl lg:px-10">
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
                <p className="text-sm text-white/60">{pageDescription}</p>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 lg:px-10 lg:py-10">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
