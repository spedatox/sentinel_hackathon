"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-cyan-500/90 text-slate-950 hover:bg-cyan-400 focus-visible:ring-cyan-300 disabled:bg-cyan-500/40",
  secondary:
    "bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white/40 disabled:bg-white/5",
  ghost: "bg-transparent text-white hover:bg-white/10 focus-visible:ring-white/40",
};

export function Button({
  variant = "primary",
  fullWidth,
  leftIcon,
  rightIcon,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
        variantClasses[variant],
        fullWidth ? "w-full" : "",
        props.disabled ? "cursor-not-allowed opacity-60" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {leftIcon}
      <span>{children}</span>
      {rightIcon}
    </button>
  );
}
