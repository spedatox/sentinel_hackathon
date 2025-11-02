"use client";

import type { Features } from "@/lib/risk";
import RiskBadge, { type RiskBucket } from "./RiskBadge";

interface InsightsDrawerProps {
  open: boolean;
  onClose: () => void;
  bucket: RiskBucket;
  explanation: string;
  factors: Features;
}

function formatNumber(value: number, fractionDigits = 1) {
  return Number.isFinite(value) ? value.toFixed(fractionDigits) : "n/a";
}

export default function InsightsDrawer({
  open,
  onClose,
  bucket,
  explanation,
  factors,
}: InsightsDrawerProps) {
  return (
    <div
      className={[
        "fixed inset-y-0 right-0 z-40 w-full max-w-md transform transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex h-full flex-col border-l border-white/10 bg-slate-950/95 backdrop-blur-lg">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">AI Insights</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 hover:bg-white/5"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div>
            <RiskBadge bucket={bucket} />
            <p className="mt-4 text-sm text-white/80">{explanation}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-white/60">
              Factor breakdown
            </h4>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-white/40">z_amount</dt>
                <dd className="font-mono text-white/80">{formatNumber(factors.z_amount)}</dd>
              </div>
              <div>
                <dt className="text-white/40">new_recipient</dt>
                <dd className="font-mono text-white/80">{factors.new_recipient ? "yes" : "no"}</dd>
              </div>
              <div>
                <dt className="text-white/40">off_hours</dt>
                <dd className="font-mono text-white/80">{factors.off_hours ? "yes" : "no"}</dd>
              </div>
              <div>
                <dt className="text-white/40">freq_spike_ratio</dt>
                <dd className="font-mono text-white/80">{formatNumber(factors.freq_spike_ratio)}</dd>
              </div>
              <div>
                <dt className="text-white/40">recipient_concentration</dt>
                <dd className="font-mono text-white/80">{formatNumber(factors.recipient_concentration, 2)}</dd>
              </div>
              <div>
                <dt className="text-white/40">asset_mix_l1</dt>
                <dd className="font-mono text-white/80">{formatNumber(factors.asset_mix_l1, 2)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
