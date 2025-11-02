"use client";

import type { ReactNode } from "react";

type AlertType = "success" | "error" | "info";

const colors: Record<AlertType, string> = {
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  error: "border-rose-400/40 bg-rose-400/10 text-rose-200",
  info: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
};

interface AlertProps {
  type?: AlertType;
  message: ReactNode;
  onClose?: () => void;
}

export function Alert({ type = "info", message, onClose }: AlertProps) {
  return (
    <div
      className={[
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
        colors[type],
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="font-semibold uppercase tracking-wide">{type}</span>
      <div className="flex-1 text-white/90">{message}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-xs uppercase tracking-wide text-white/70 hover:text-white"
        >
          Close
        </button>
      )}
    </div>
  );
}
