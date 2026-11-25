import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getStats } from "@/api/admin";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { ErrorState } from "@/components/ui/StateViews";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Dashboard() {
  const { data: stats, isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ["admin", "stats"], queryFn: getStats });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse bg-stone-200" />
        ))}
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <ErrorState
        title="Dashboard metrics unavailable"
        message="Unable to load administrative statistics and sales analytics. Please check your connection."
        onRetry={() => refetch()}
        isRetrying={isFetching}
      />
    );
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-3xl">Dashboard</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue (all time)" value={formatMoney(stats.revenue_total)} />
        <StatCard label="Revenue (30 days)" value={formatMoney(stats.revenue_30d)} />
        <StatCard label="Orders (30 days)" value={String(stats.orders_30d)} />
        <StatCard label="Customers" value={String(stats.customer_count)} />
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Top products */}
        <section>
          <h2 className="mb-4 text-xs uppercase tracking-widest text-stone-500">Top products</h2>
          <div className="border border-stone-200">
            {stats.top_products.length === 0 ? (
              <p className="p-6 text-sm text-stone-400">No sales yet.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {stats.top_products.map((p, i) => (
                  <li key={p.name} className="flex items-center gap-4 px-5 py-4 text-sm">
                    <span className="font-display text-lg text-stone-300">{i + 1}</span>
                    <span className="flex-1">{p.name}</span>
                    <span className="text-stone-400">{p.units} sold</span>
                    <span className="w-20 text-right font-medium">{formatMoney(p.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Orders by status */}
        <section>
          <h2 className="mb-4 text-xs uppercase tracking-widest text-stone-500">Orders by status</h2>
          <div className="border border-stone-200">
            <ul className="divide-y divide-stone-100">
              {Object.entries(stats.orders_by_status).map(([status, count]) => (
                <li key={status} className="flex items-center justify-between px-5 py-3">
                  <OrderStatusBadge status={status as keyof typeof stats.orders_by_status} />
                  <span className="text-sm">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* Low stock */}
      {stats.low_stock.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest text-accent">Low stock — restock soon</h2>
            <Link to="/admin/inventory?low=true" className="text-xs uppercase tracking-widest text-stone-500 hover:text-ink">
              View all →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.low_stock.slice(0, 6).map((v) => (
              <div key={v.sku} className="flex items-center justify-between border border-accent/30 px-4 py-3 text-sm">
                <span>
                  {v.product_name}
                  <span className="block text-xs text-stone-500">
                    {v.color_name} / {v.size_name} · {v.sku}
                  </span>
                </span>
                <span className={cn("font-medium", v.stock === 0 ? "text-accent" : "text-ink")}>{v.stock} left</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent orders */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest text-stone-500">Recent orders</h2>
          <Link to="/admin/orders" className="text-xs uppercase tracking-widest text-stone-500 hover:text-ink">
            All orders →
          </Link>
        </div>
        <div className="overflow-x-auto border border-stone-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-widest text-stone-500">
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_orders.map((o) => (
                <tr key={o.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-5 py-3">
                    <Link to={`/admin/orders/${o.order_number}`} className="hover:underline">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{o.customer_name ?? "—"}</td>
                  <td className="px-5 py-3 text-stone-500">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-5 py-3 text-right">{formatMoney(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-stone-200 p-5">
      <p className="text-xs uppercase tracking-widest text-stone-500">{label}</p>
      <p className="mt-2 font-display text-2xl">{value}</p>
    </div>
  );
}