import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { containDialogFocus } from "@/lib/dialog";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "right" | "left";
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  side = "right",
}: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      dialog.dataset.closing = "false";
      if (!dialog.open) dialog.showModal();
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    if (dialog.open) {
      dialog.dataset.closing = "true";
      const delay = window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
        ? 0
        : 300;
      const timeout = window.setTimeout(() => dialog.close(), delay);
      return () => window.clearTimeout(timeout);
    }
  }, [open]);

  return createPortal(
    <dialog
      ref={ref}
      className="studio-drawer"
      data-side={side}
      aria-label={title}
      onKeyDown={containDialogFocus}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="studio-drawer-panel">
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-stone-200 px-6">
          <h2 className="font-display text-2xl">{title}</h2>
          <button
            type="button"
            aria-label={`Close ${title.toLowerCase()}`}
            onClick={onClose}
            className="nav-icon"
          >
            <X size={21} strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-stone-200 p-6">{footer}</div>
        )}
      </div>
    </dialog>,
    document.body,
  );
}
