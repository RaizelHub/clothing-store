import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Package } from "lucide-react";
import { getMyOrders } from "@/api/orders";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { Skeleton } from "@/components/ui/misc";
import { formatDate, formatMoney } from "@/lib/format";

export function OrdersPage() {
  const { data: orders, isLoading, isError } = useQuery({ queryKey: ["orders"], queryFn: getMyOrders });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-xs text-accent">Unable to retrieve order history.</p>;
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-stone-100 mx-auto mb-4 text-stone-400">
          <Package size={20} strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-2xl text-ink">No orders found</h3>
        <p className="mt-2 text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
          When you purchase from our collections, your order receipts and courier tracking will be catalogued here.
        </p>
        <Link
          to="/new"
          className="mt-6 inline-flex items-center gap-2 bg-ink text-paper px-6 py-2.5 text-[11px] uppercase tracking-widest font-medium hover:bg-stone-800 transition-colors"
        >
          Explore New Arrivals <ArrowRight size={13} />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-stone-200 pb-4 mb-6 flex items-baseline justify-between">
        <h2 className="text-xs uppercase tracking-widest font-medium text-ink">Order History</h2>
        <span className="font-mono text-[11px] text-stone-400">
          {orders.length} {orders.length === 1 ? "Order" : "Orders"} Placed
        </span>
      </div>

      <ul className="divide-y divide-stone-200/80">
        {orders.map((o) => (
          <li key={o.id} className="py-5 first:pt-0 last:pb-0">
            <Link
              to={`/account/orders/${o.order_number}`}
              className="group flex flex-wrap items-center justify-between gap-4 transition-colors"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-medium text-ink group-hover:text-stone-600 transition-colors">
                    {o.order_number}
                  </span>
                  <OrderStatusBadge status={o.status} />
                </div>
                <p className="mt-1 text-[11px] text-stone-500 font-mono">
                  {formatDate(o.created_at)} · {o.items.reduce((s, i) => s + i.quantity, 0)} items
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono text-sm font-medium text-ink">{formatMoney(o.total)}</span>
                <span className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-ink font-medium">
                  Details <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}