"use client";

import { useLanguage } from "@/providers/LanguageProvider";

export type RiskBucket = "low" | "medium" | "high";

interface RiskBadgeProps {
  bucket: RiskBucket;
  size?: "sm" | "md";
  onClick?: () => void;
  className?: string;
}

const bucketConfig: Record<RiskBucket, { colors: string }> = {
  low: { colors: "bg-emerald-500/15 text-emerald-300 border-emerald-400/40" },
  medium: { colors: "bg-amber-500/15 text-amber-300 border-amber-400/40" },
  high: { colors: "bg-rose-500/15 text-rose-300 border-rose-400/40" },
};

export function RiskBadge({ bucket, size = "md", onClick, className }: RiskBadgeProps) {
  const { t } = useLanguage();
  const config = bucketConfig[bucket];
  const label = bucket === "low" ? t.risk.low : bucket === "medium" ? t.risk.medium : t.risk.high;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center rounded-full border font-semibold transition-colors",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
        config.colors,
        onClick ? "hover:opacity-90" : "cursor-default",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="h-2 w-2 rounded-full bg-current opacity-80" />
      <span className="ml-2">{label}</span>
    </button>
  );
}

export default RiskBadge;
