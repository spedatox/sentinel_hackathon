'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FiShield, FiLock, FiZap, FiTrendingUp, FiUsers, FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/providers/LanguageProvider';
import { LanguageToggle } from '@/components/LanguageToggle';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
              <Image
                src="/sentinel_logo.png"
                alt="Sentinel Logo"
                width={48}
                height={48}
                className="relative z-10"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                SENTINEL
              </h1>
              <p className="text-xs text-slate-400">AI-Powered Security</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <Link
              href="/app"
              className="group flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 rounded-lg font-semibold hover:from-cyan-500 hover:to-indigo-500 transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
            >
              {t.landing.launchApp}
              <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 pt-20 pb-32">
        <div className={`max-w-5xl mx-auto text-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-block mb-6 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
            <span className="text-sm text-cyan-400 font-medium">{t.landing.tagline}</span>
          </div>
          
          <h2 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            {t.landing.heroTitle}{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              {t.landing.heroTitleHighlight}
            </span>
            <br />
            {t.landing.heroTitle2}
          </h2>
          
          <p className="text-xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            {t.landing.heroDescription}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/app"
              className="group w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-600 to-indigo-600 rounded-xl font-bold text-lg hover:from-cyan-500 hover:to-indigo-500 transition-all shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105"
            >
              {t.landing.getStarted}
              <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 border-2 border-white/10 rounded-xl font-bold text-lg hover:bg-white/5 transition-all backdrop-blur-sm">
              {t.landing.watchDemo}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { value: '99.9%', label: t.landing.stats.detection },
              { value: '<100ms', label: t.landing.stats.speed },
              { value: '24/7', label: t.landing.stats.monitoring },
              { value: '100%', label: t.landing.stats.native },
            ].map((stat, i) => (
              <div key={i} className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold mb-4">
              {t.landing.features.title}{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                {t.landing.features.titleHighlight}
              </span>
            </h3>
            <p className="text-xl text-slate-400">
              {t.landing.features.subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: FiZap,
                title: t.landing.features.aiRisk.title,
                description: t.landing.features.aiRisk.desc,
                gradient: 'from-cyan-500/10 to-cyan-500/5',
                iconColor: 'text-cyan-400',
                border: 'border-cyan-500/20',
              },
              {
                icon: FiUsers,
                title: t.landing.features.guardian.title,
                description: t.landing.features.guardian.desc,
                gradient: 'from-indigo-500/10 to-indigo-500/5',
                iconColor: 'text-indigo-400',
                border: 'border-indigo-500/20',
              },
              {
                icon: FiLock,
                title: t.landing.features.totp.title,
                description: t.landing.features.totp.desc,
                gradient: 'from-purple-500/10 to-purple-500/5',
                iconColor: 'text-purple-400',
                border: 'border-purple-500/20',
              },
              {
                icon: FiTrendingUp,
                title: t.landing.features.context.title,
                description: t.landing.features.context.desc,
                gradient: 'from-pink-500/10 to-pink-500/5',
                iconColor: 'text-pink-400',
                border: 'border-pink-500/20',
              },
              {
                icon: FiShield,
                title: t.landing.features.telegram.title,
                description: t.landing.features.telegram.desc,
                gradient: 'from-emerald-500/10 to-emerald-500/5',
                iconColor: 'text-emerald-400',
                border: 'border-emerald-500/20',
              },
              {
                icon: FiCheckCircle,
                title: t.landing.features.soroban.title,
                description: t.landing.features.soroban.desc,
                gradient: 'from-amber-500/10 to-amber-500/5',
                iconColor: 'text-amber-400',
                border: 'border-amber-500/20',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className={`group p-8 bg-gradient-to-br ${feature.gradient} backdrop-blur-sm border ${feature.border} rounded-2xl hover:scale-105 transition-all duration-300 cursor-pointer`}
              >
                <div className={`w-14 h-14 ${feature.iconColor} bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold mb-3">{feature.title}</h4>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold mb-4">
              {t.landing.howItWorks.title}{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                {t.landing.howItWorks.titleHighlight}
              </span>
            </h3>
            <p className="text-xl text-slate-400">
              {t.landing.howItWorks.subtitle}
            </p>
          </div>

          <div className="space-y-8">
            {[
              {
                step: '01',
                title: t.landing.howItWorks.low.title,
                description: t.landing.howItWorks.low.desc,
                bgGradient: 'from-emerald-500/20 to-emerald-500/10',
                border: 'border-emerald-500/30',
                textColor: 'text-emerald-400',
              },
              {
                step: '02',
                title: t.landing.howItWorks.medium.title,
                description: t.landing.howItWorks.medium.desc,
                bgGradient: 'from-amber-500/20 to-amber-500/10',
                border: 'border-amber-500/30',
                textColor: 'text-amber-400',
              },
              {
                step: '03',
                title: t.landing.howItWorks.high.title,
                description: t.landing.howItWorks.high.desc,
                bgGradient: 'from-rose-500/20 to-rose-500/10',
                border: 'border-rose-500/30',
                textColor: 'text-rose-400',
              },
            ].map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-6 p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:border-white/20 transition-all"
              >
                <div className={`flex-shrink-0 w-16 h-16 bg-gradient-to-br ${step.bgGradient} border ${step.border} rounded-xl flex items-center justify-center`}>
                  <span className={`text-2xl font-bold ${step.textColor}`}>{step.step}</span>
                </div>
                <div>
                  <h4 className="text-2xl font-bold mb-2">{step.title}</h4>
                  <p className="text-slate-400 text-lg">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-4xl md:text-5xl font-bold mb-4">
            {t.landing.tech.title}{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              {t.landing.tech.titleHighlight}
            </span>
          </h3>
          <p className="text-xl text-slate-400 mb-12">
            {t.landing.tech.subtitle}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Stellar', desc: 'Blockchain' },
              { name: 'Soroban', desc: 'Smart Contracts' },
              { name: 'OpenAI', desc: 'Risk Analysis' },
              { name: 'Telegram', desc: 'Notifications' },
              { name: 'Next.js', desc: 'Frontend' },
              { name: 'Supabase', desc: 'Database' },
              { name: 'TypeScript', desc: 'Type Safety' },
              { name: 'Freighter', desc: 'Wallet' },
            ].map((tech, i) => (
              <div
                key={i}
                className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 hover:border-cyan-500/30 transition-all cursor-pointer"
              >
                <div className="text-lg font-bold mb-1">{tech.name}</div>
                <div className="text-sm text-slate-400">{tech.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-6 py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 backdrop-blur-sm border border-white/20 rounded-3xl">
            <h3 className="text-5xl font-bold mb-6">
              {t.landing.cta.title}{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                {t.landing.cta.titleHighlight}
              </span>
            </h3>
            <p className="text-xl text-slate-300 mb-10">
              {t.landing.cta.subtitle}
            </p>
            <Link
              href="/app"
              className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-cyan-600 to-indigo-600 rounded-xl font-bold text-xl hover:from-cyan-500 hover:to-indigo-500 transition-all shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105"
            >
              {t.landing.launchSentinel}
              <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/sentinel_logo.png"
                alt="Sentinel Logo"
                width={32}
                height={32}
              />
              <span className="font-bold text-lg">SENTINEL</span>
            </div>
            <p className="text-slate-400 text-sm">
              {t.landing.footer.copyright}
            </p>
            <div className="flex gap-4">
              <button className="text-slate-400 hover:text-cyan-400 transition-colors">Twitter</button>
              <button className="text-slate-400 hover:text-cyan-400 transition-colors">GitHub</button>
              <button className="text-slate-400 hover:text-cyan-400 transition-colors">Discord</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
