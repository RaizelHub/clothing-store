import { Link, useLocation, useParams } from "react-router-dom";
import { useSession } from "@/hooks/auth";
import { Button } from "@/components/ui/Button";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { Order } from "@/types/api";

export function CheckoutSuccessPage() {
  const location = useLocation();
  const { orderNumber = "" } = useParams();
  const order = (location.state as { order?: Order } | null)?.order;
  const { data: me } = useSession();

  return (
    <section className="container-editorial py-20 md:py-28">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-ink">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 12.5l5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-8 font-display text-4xl">Order confirmed</h1>
        <p className="mt-3 text-sm text-stone-500">
          {order
            ? `Order ${order.order_number} placed ${formatDateTime(order.created_at)}. A confirmation email is on its way${
                me ? "" : " (guest orders aren't linked to an account — keep the number handy)"
              }.`
            : `Order ${orderNumber} placed. A confirmation email is on its way.`}
        </p>

        {order && (
          <div className="mx-auto mt-10 max-w-sm border border-stone-200 p-6 text-left">
            <p className="text-xs uppercase tracking-widest text-stone-500">Order summary</p>
            <ul className="mt-4 space-y-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 text-sm">
                  <img src={item.image ?? undefined} alt={item.product_name} className="aspect-[4/5] w-10 object-cover" />
                  <span className="flex-1">
                    {item.product_name}
                    <span className="block text-xs text-stone-500">
                      {item.color_name} / {item.size_name} × {item.quantity}
                    </span>
                  </span>
                  <span>{formatMoney(String(Number(item.unit_price) * item.quantity))}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-stone-200 pt-3 font-display text-lg">
              <span>Total</span>
              <span>{formatMoney(order.total)}</span>
            </div>
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {me && (
            <Link to="/account/orders">
              <Button variant="outline">View order history</Button>
            </Link>
          )}
          <Link to="/new">
            <Button>Continue shopping</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}