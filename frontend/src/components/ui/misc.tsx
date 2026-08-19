import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "sale" }) {
  return (
    <span
      className={cn(
        "px-2 py-1 text-[10px] font-medium uppercase tracking-widest",
        tone === "sale" ? "bg-accent text-paper" : "bg-paper/90 text-ink/90"
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-stone-200", className)} />;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-stone-300 px-6 py-20 text-center">
      <h3 className="font-display text-xl">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-sm text-stone-500">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Notice({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const tones = {
    error: "border-accent/40 bg-accent/5 text-accent",
    success: "border-stone-600/30 bg-stone-100 text-ink",
    info: "border-stone-300 bg-stone-50 text-ink/80",
  };
  return <div className={cn("border px-4 py-3 text-sm", tones[tone])}>{children}</div>;
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-ink/70" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"
            fill={i <= Math.round(value) ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
      ))}
    </span>
  );
}

export function QuantityStepper({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange: (next: number) => void;
  max: number;
}) {
  return (
    <div className="inline-flex items-center border border-stone-300">
      <button
        aria-label="Decrease quantity"
        className="px-3 py-2 text-stone-500 transition-colors hover:text-ink disabled:opacity-30"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span className="min-w-8 text-center text-sm tabular-nums">{value}</span>
      <button
        aria-label="Increase quantity"
        className="px-3 py-2 text-stone-500 transition-colors hover:text-ink disabled:opacity-30"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}