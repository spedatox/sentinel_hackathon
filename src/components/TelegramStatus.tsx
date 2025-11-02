"use client";

import { Card } from "@/components/ui/card";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiSend,
} from "react-icons/fi";

type TelegramStatusProps = {
  status: "idle" | "waiting" | "approved" | "error";
  message?: string;
  txId?: string;
};

const statusCopy: Record<
  TelegramStatusProps["status"],
  {
    label: string;
    hint: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
    badge: string;
  }
> = {
  idle: {
    label: "No alerts dispatched",
    hint: "High-risk approvals will appear here once triggered.",
    icon: FiSend,
    accent: "bg-white/10 text-white/70",
    badge: "text-white/50",
  },
  waiting: {
    label: "Awaiting Telegram approval",
    hint: "Guardian review required before this transfer can settle.",
    icon: FiClock,
    accent: "bg-amber-500/15 text-amber-200",
    badge: "text-amber-200",
  },
  approved: {
    label: "Approved via Telegram",
    hint: "Guardian co-signed the request. You may resume processing.",
    icon: FiCheckCircle,
    accent: "bg-emerald-500/15 text-emerald-200",
    badge: "text-emerald-200",
  },
  error: {
    label: "Alert failed",
    hint: "Retry dispatch or verify your Telegram configuration.",
    icon: FiAlertTriangle,
    accent: "bg-rose-500/15 text-rose-200",
    badge: "text-rose-200",
  },
};

export default function TelegramStatus({
  status,
  message,
  txId,
}: TelegramStatusProps) {
  const copy = statusCopy[status];
  const Icon = copy.icon;

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${copy.accent}`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">{copy.label}</p>
            <p className="text-xs text-white/60">{message || copy.hint}</p>
          </div>
        </div>
        <span className={`text-[11px] uppercase tracking-wide ${copy.badge}`}>
          Telegram
        </span>
      </div>

      {txId && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-wide text-white/40">
            Last Telegram transaction id
          </p>
          <p className="mt-1 font-mono text-xs text-cyan-200">{txId}</p>
        </div>
      )}
    </Card>
  );
}
