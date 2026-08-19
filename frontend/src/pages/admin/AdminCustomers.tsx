import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listCustomers } from "@/api/admin";
import { formatMoney, formatDate } from "@/lib/format";

export function AdminCustomers() {
  const { data: customers, isLoading } = useQuery({ queryKey: ["admin", "customers"], queryFn: listCustomers });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">Customers</h1>
      </header>

      <div className="overflow-x-auto border border-stone-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-widest text-stone-500">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3">Orders</th>
              <th className="px-5 py-3 text-right">Spent</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-stone-400">
                  Loading…
                </td>
              </tr>
            ) : !customers || customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-stone-400">
                  No customers yet.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-5 py-3">
                    <Link to={`/admin/customers/${c.id}`} className="font-medium hover:underline">
                      {c.first_name} {c.last_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-stone-500">{c.email}</td>
                  <td className="px-5 py-3 text-stone-500">{formatDate(c.created_at)}</td>
                  <td className="px-5 py-3">{c.order_count}</td>
                  <td className="px-5 py-3 text-right">{formatMoney(c.total_spent)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}