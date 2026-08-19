import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "inverse";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-stone-800 active:scale-[0.99]",
  secondary: "bg-stone-100 text-ink border border-stone-200/80 hover:bg-stone-200/70 hover:border-stone-300 active:scale-[0.99]",
  outline: "border border-ink/40 text-ink bg-transparent hover:border-ink hover:bg-ink hover:text-paper active:scale-[0.99]",
  ghost: "text-ink/80 hover:text-ink hover:bg-stone-100/60",
  inverse: "bg-paper text-ink hover:bg-stone-200 active:scale-[0.99]",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-[11px] font-medium",
  md: "px-6 py-3 text-xs font-medium",
  lg: "px-8 py-3.5 text-xs font-medium",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 uppercase tracking-widest transition-all duration-300 ease-editorial disabled:cursor-not-allowed disabled:opacity-40 select-none",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner className="size-3.5" />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-3.5 animate-spin rounded-full border border-current border-t-transparent",
        className
      )}
    />
  );
}