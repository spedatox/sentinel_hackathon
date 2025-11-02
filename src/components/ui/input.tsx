"use client";

import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <label className="flex flex-col gap-2 text-sm text-white/80">
      {label && <span className="font-medium text-white">{label}</span>}
      <input
        className={[
          "rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white shadow-inner transition focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/60",
          error ? "border-rose-400/60 focus:ring-rose-400/60" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
      {error && <span className="text-xs text-rose-300">{error}</span>}
    </label>
  );
}
