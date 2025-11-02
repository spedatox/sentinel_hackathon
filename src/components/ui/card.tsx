"use client";

import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className }: CardProps) {
  return (
    <section
      className={[
        "rounded-3xl border border-white/10 bg-slate-950/60 p-6 backdrop-blur",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {title && <h2 className="mb-4 text-xl font-semibold text-white">{title}</h2>}
      {children}
    </section>
  );
}
