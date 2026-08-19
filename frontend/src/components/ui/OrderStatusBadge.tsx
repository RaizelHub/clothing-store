import type { OrderStatus } from "@/types/api";
import { cn } from "@/lib/utils";

const STYLES: Record<OrderStatus, string> = {
  pending: "border-stone-300 text-stone-500",
  paid: "border-ink text-ink",
  processing: "border-stone-600 text-stone-700",
  shipped: "border-stone-800 text-stone-700",
  delivered: "bg-ink text-paper border-ink",
  cancelled: "border-accent/50 text-accent",
  refunded: "border-accent/50 text-accent",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2.5 py-1 text-[10px] uppercase tracking-widest",
        STYLES[status]
      )}
    >
      {status}
    </span>
  );
}