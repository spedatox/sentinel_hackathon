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
        "rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm p-6 hover:scale-[1.01] transition-all duration-300",
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
