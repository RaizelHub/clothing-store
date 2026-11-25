import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listAdminOrders } from "@/api/admin";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { ErrorState, TableSkeleton } from "@/components/ui/StateViews";
import { formatMoney } from "@/lib/format";
import type { OrderStatus } from "@/types/api";
import { ORDER_STATUSES } from "@/types/api";
import { cn } from "@/lib/utils";

const FILTERS: (OrderStatus | "all")[] = ["all", ...ORDER_STATUSES];

export function AdminOrders() {
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as OrderStatus | "all") ?? "all";

  const { data: orders, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin", "orders", status],
    queryFn: () => listAdminOrders(status),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">Orders</h1>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setParams(s === "all" ? {} : { status: s })}
            className={cn(
              "border px-3 py-1.5 text-xs uppercase tracking-widest transition-colors",
              status === s ? "border-ink bg-ink text-paper" : "border-stone-300 text-stone-500 hover:border-ink"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto border border-stone-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-widest text-stone-500">
              <th className="px-5 py-3">Order</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Items</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {isError ? (
              <tr>
                <td colSpan={6} className="p-6">
                  <ErrorState
                    title="Orders unavailable"
                    message="Unable to retrieve customer orders."
                    onRetry={() => refetch()}
                    isRetrying={isFetching}
                    compact
                  />
                </td>
              </tr>
            ) : isLoading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : !orders || orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-stone-400">
                  <p className="text-sm font-medium text-stone-600">No orders placed</p>
                  <p className="mt-1 text-xs text-stone-400">
                    {status !== "all" ? `No orders found matching status "${status}".` : "Customer orders will appear here once checkout is completed."}
                  </p>
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-5 py-3">
                    <Link to={`/admin/orders/${o.order_number}`} className="font-medium hover:underline">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{o.customer_name ?? o.customer_email ?? "—"}</td>
                  <td className="px-5 py-3 text-stone-500">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td className="px-5 py-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-5 py-3 text-right">{formatMoney(o.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}