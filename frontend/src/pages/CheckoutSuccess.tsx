import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock, AlertCircle } from "lucide-react";
import { useSession } from "@/hooks/auth";
import { getOrderStatus } from "@/api/orders";
import { Button } from "@/components/ui/Button";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { Order } from "@/types/api";

export function CheckoutSuccessPage() {
  const location = useLocation();
  const { orderNumber = "" } = useParams();
  const initialOrder = (location.state as { order?: Order } | null)?.order;
  const { data: me } = useSession();

  const [pollCount, setPollCount] = useState(0);

  // Poll order status if status is still pending (e.g. awaiting PayMongo webhook)
  const { data: statusData } = useQuery({
    queryKey: ["orders", "status", orderNumber],
    queryFn: () => getOrderStatus(orderNumber),
    enabled: Boolean(orderNumber),
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.status || initialOrder?.status;
      if (currentStatus === "pending" && pollCount < 12) {
        return 2500;
      }
      return false;
    },
  });

  useEffect(() => {
    if (statusData?.status === "pending") {
      setPollCount((prev) => prev + 1);
    }
  }, [statusData?.status]);

  const currentStatus = statusData?.status || initialOrder?.status || "pending";
  const items = statusData?.items || initialOrder?.items || [];
  const total = statusData?.total || initialOrder?.total || "0.00";
  const createdAt = statusData?.created_at || initialOrder?.created_at || new Date().toISOString();

  const isPaid = currentStatus === "paid" || currentStatus === "processing" || currentStatus === "shipped" || currentStatus === "delivered";
  const isFailed = currentStatus === "failed" || currentStatus === "expired";
  const isCancelled = currentStatus === "cancelled";

  return (
    <section className="container-editorial py-20 md:py-28">
      <div className="mx-auto max-w-xl text-center">
        {/* Status Icon */}
        {isPaid ? (
          <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-ink bg-paper text-ink">
            <Check size={26} strokeWidth={1.5} />
          </div>
        ) : isFailed || isCancelled ? (
          <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-stone-300 bg-stone-50 text-stone-600">
            <AlertCircle size={26} strokeWidth={1.5} />
          </div>
        ) : (
          <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-stone-300 bg-paper text-stone-600">
            <Clock size={24} strokeWidth={1.5} className="animate-pulse" />
          </div>
        )}

        {/* Heading & Subtitle */}
        {isPaid ? (
          <>
            <h1 className="mt-8 font-display text-4xl">Order confirmed</h1>
            <p className="mt-3 text-sm text-stone-500">
              Order {orderNumber} placed {formatDateTime(createdAt)}. A confirmation email is on its way
              {me ? "" : " (guest orders aren't linked to an account — keep the number handy)"}.
            </p>
          </>
        ) : isFailed ? (
          <>
            <h1 className="mt-8 font-display text-4xl">Payment incomplete</h1>
            <p className="mt-3 text-sm text-stone-500">
              The payment for order {orderNumber} was not completed or the session expired.
            </p>
          </>
        ) : isCancelled ? (
          <>
            <h1 className="mt-8 font-display text-4xl">Order cancelled</h1>
            <p className="mt-3 text-sm text-stone-500">
              Order {orderNumber} was cancelled. Any reserved items have been restored.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-8 font-display text-4xl">Verifying payment</h1>
            <p className="mt-3 text-sm text-stone-500">
              We are confirming your payment with PayMongo. This usually takes just a few seconds.
            </p>
            {pollCount >= 10 && (
              <p className="mt-2 text-xs text-stone-400">
                Still waiting for confirmation. If you completed payment, your receipt will be sent via email shortly.
              </p>
            )}
          </>
        )}

        {/* Order summary block */}
        {items.length > 0 && (
          <div className="mx-auto mt-10 max-w-sm border border-stone-200 p-6 text-left">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-stone-500">Order summary</p>
              <span className="text-xs font-mono uppercase text-stone-400">{currentStatus}</span>
            </div>
            <ul className="mt-4 space-y-3">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 text-sm">
                  {item.image && (
                    <img src={item.image} alt={item.product_name} className="aspect-[4/5] w-10 object-cover" />
                  )}
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
              <span>{formatMoney(total)}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {isFailed ? (
            <Link to="/checkout">
              <Button>Try checkout again</Button>
            </Link>
          ) : (
            <>
              {me && (
                <Link to="/account/orders">
                  <Button variant="outline">View order history</Button>
                </Link>
              )}
              <Link to="/new">
                <Button>Continue shopping</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
