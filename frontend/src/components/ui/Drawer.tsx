import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "right" | "left";
}

export function Drawer({ open, onClose, title, children, footer, side = "right" }: DrawerProps) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="absolute inset-0 bg-ink/40 transition-opacity duration-300 ease-editorial"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "absolute inset-y-0 flex w-full max-w-md flex-col bg-paper transition-transform duration-400 ease-editorial",
          side === "right" ? "right-0" : "left-0"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-stone-200 px-6">
          <h2 className="text-sm uppercase tracking-widest">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="text-ink/70 hover:text-ink">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="shrink-0 border-t border-stone-200 p-6">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}