import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCustomer } from "@/api/admin";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { formatMoney, formatDate } from "@/lib/format";

export function AdminCustomerDetail() {
  const { id = "" } = useParams();
  const { data: customer, isLoading } = useQuery({
    queryKey: ["admin", "customers", Number(id)],
    queryFn: () => getCustomer(Number(id)),
    enabled: Boolean(id),
  });

  if (isLoading) return <p className="text-sm text-stone-400">Loading…</p>;
  if (!customer) return <p className="text-sm text-accent">Customer not found.</p>;

  return (
    <div className="space-y-8">
      <header>
        <Link to="/admin/customers" className="text-xs uppercase tracking-widest text-stone-500 hover:text-ink">
          ← Customers
        </Link>
        <h1 className="mt-2 font-display text-3xl">
          {customer.first_name} {customer.last_name}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {customer.email} · joined {formatDate(customer.created_at)} · {customer.order_count} orders ·{" "}
          {formatMoney(customer.total_spent)} spent
        </p>
      </header>

      {customer.addresses.length > 0 && (
        <section className="border border-stone-200 p-5 text-sm">
          <h2 className="text-xs uppercase tracking-widest text-stone-500">Addresses</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {customer.addresses.map((a) => (
              <div key={a.id} className="text-sm">
                <p className="font-medium">
                  {a.label}
                  {a.is_default && <span className="ml-2 text-[10px] uppercase tracking-widest text-stone-400">default</span>}
                </p>
                <p className="mt-1 text-stone-600">{a.line1}</p>
                <p className="text-stone-600">
                  {a.city}
                  {a.state && `, ${a.state}`} {a.postal_code}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xs uppercase tracking-widest text-stone-500">Orders</h2>
        {customer.orders.length === 0 ? (
          <p className="text-sm text-stone-400">No orders yet.</p>
        ) : (
          <div className="border border-stone-200">
            <ul className="divide-y divide-stone-100">
              {customer.orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
                  <div>
                    <Link to={`/admin/orders/${o.order_number}`} className="font-medium hover:underline">
                      {o.order_number}
                    </Link>
                    <span className="ml-3 text-stone-500">{formatDate(o.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <OrderStatusBadge status={o.status} />
                    <span>{formatMoney(o.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}