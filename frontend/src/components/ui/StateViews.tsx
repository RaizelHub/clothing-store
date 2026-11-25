import type { ReactNode } from "react";
import { AlertCircle, RefreshCw, WifiOff, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: unknown;
  onRetry?: () => void;
  isRetrying?: boolean;
  action?: ReactNode;
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title = "Unable to load content",
  message,
  error,
  onRetry,
  isRetrying = false,
  action,
  secondaryAction,
  className,
  compact = false,
}: ErrorStateProps) {
  // Extract human-friendly error if message is not explicitly passed
  let resolvedMessage = message;
  if (!resolvedMessage) {
    if (typeof error === "string") {
      resolvedMessage = error;
    } else if (error && typeof error === "object" && "message" in error && typeof (error as Error).message === "string") {
      const msg = (error as Error).message;
      if (msg.includes("Network Error") || msg.includes("Failed to fetch") || msg.includes("ERR_CONNECTION")) {
        resolvedMessage = "Unable to connect to Studio. Please check your network connection and try again.";
      } else {
        resolvedMessage = "A temporary server interruption occurred. Please try again in a moment.";
      }
    } else {
      resolvedMessage = "A temporary communication error occurred. Please try again.";
    }
  }

  const isNetwork =
    resolvedMessage?.toLowerCase().includes("network") ||
    resolvedMessage?.toLowerCase().includes("connect");

  if (compact) {
    return (
      <div
        role="alert"
        className={cn(
          "flex flex-col sm:flex-row items-center justify-between gap-3 border border-accent/20 bg-accent/5 p-4 text-xs text-accent",
          className
        )}
      >
        <div className="flex items-center gap-2">
          {isNetwork ? <WifiOff size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
          <span>{resolvedMessage}</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-1.5 uppercase tracking-widest text-[10.5px] font-medium text-ink underline underline-offset-2 hover:text-accent disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={11} className={cn(isRetrying && "animate-spin")} />
            {isRetrying ? "Retrying…" : "Retry"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center border border-stone-200/90 bg-paper p-8 sm:p-14 text-center",
        className
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent">
        {isNetwork ? <WifiOff size={20} strokeWidth={1.5} /> : <AlertCircle size={20} strokeWidth={1.5} />}
      </div>

      <h3 className="font-display text-2xl text-ink">{title}</h3>

      <p className="mt-2 max-w-md text-xs sm:text-sm text-stone-500 leading-relaxed">
        {resolvedMessage}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onRetry}
            loading={isRetrying}
            className="gap-2"
          >
            <RefreshCw size={13} className={cn(isRetrying && "animate-spin")} />
            Try Again
          </Button>
        )}

        {action}

        {secondaryAction &&
          (secondaryAction.href ? (
            <Link
              to={secondaryAction.href}
              className="inline-flex items-center gap-1.5 border border-stone-300 bg-paper px-4 py-2 text-xs uppercase tracking-widest font-medium text-stone-600 hover:border-ink hover:text-ink transition-colors"
            >
              <ArrowLeft size={12} />
              {secondaryAction.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="inline-flex items-center gap-1.5 border border-stone-300 bg-paper px-4 py-2 text-xs uppercase tracking-widest font-medium text-stone-600 hover:border-ink hover:text-ink transition-colors"
            >
              {secondaryAction.label}
            </button>
          ))}
      </div>
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  cols = 5,
  className = "",
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className={cn("border-b border-stone-100 last:border-0", className)}>
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} className="px-5 py-4">
              <div
                className="h-4 animate-pulse rounded-none bg-stone-200/70"
                style={{ width: `${Math.max(40, ((cIdx * 27 + rIdx * 19) % 55) + 45)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
