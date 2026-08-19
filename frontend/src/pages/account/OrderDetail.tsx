import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Truck } from "lucide-react";
import { cancelOrder, getMyOrder } from "@/api/orders";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { Button } from "@/components/ui/Button";
import { Notice, Skeleton } from "@/components/ui/misc";
import { formatDateTime, formatMoney } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/errors";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function OrderDetailPage() {
  const { orderNumber = "" } = useParams();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["orders", orderNumber],
    queryFn: () => getMyOrder(orderNumber),
    enabled: Boolean(orderNumber),
  });

  const cancel = useMutation({
    mutationFn: () => cancelOrder(orderNumber),
    onSuccess: (updated) => {
      setMessage({ ok: true, text: "Order cancelled." });
      queryClient.setQueryData(["orders", orderNumber], updated);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e) => setMessage({ ok: false, text: getApiErrorMessage(e) }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="py-12 text-center">
        <p className="text-xs text-stone-500">Order not found or access restricted.</p>
        <Link to="/account/orders" className="mt-4 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-ink hover:underline">
          <ArrowLeft size={12} /> Return to Orders
        </Link>
      </div>
    );
  }

  const canCancel = order.status === "pending" || order.status === "paid";

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/account/orders"
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-stone-500 hover:text-ink transition-colors mb-4"
        >
          <ArrowLeft size={12} /> Back to order history
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
          <div>
            <h2 className="font-mono text-2xl font-medium text-ink">{order.order_number}</h2>
            <p className="mt-1 text-[11px] text-stone-500 font-mono">
              Placed {formatDateTime(order.created_at)} · {order.items.reduce((s, i) => s + i.quantity, 0)} items
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {message && (
        <div>
          <Notice tone={message.ok ? "success" : "error"}>{message.text}</Notice>
        </div>
      )}

      {/* Visual Timeline Stepper */}
      <div className="border border-stone-200/80 bg-stone-50/40 p-6">
        <h3 className="text-[11px] uppercase tracking-widest text-stone-500 font-medium mb-4">
          Fulfillment Timeline
        </h3>
        <ol className="relative space-y-4 border-l border-stone-300 ml-2.5 pl-6">
          {order.timeline.map((entry, i) => {
            const isLatest = i === order.timeline.length - 1;
            return (
              <li key={i} className="relative">
                <span
                  className={cn(
                    "absolute -left-[31px] top-1 size-3.5 rounded-full border flex items-center justify-center",
                    isLatest
                      ? "border-ink bg-ink ring-4 ring-stone-100"
                      : "border-stone-400 bg-paper"
                  )}
                />
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <span className="text-xs font-medium text-ink capitalize">
                    {entry.status}
                    {entry.note && (
                      <span className="ml-2 font-normal text-stone-500 font-sans">
                        — {entry.note}
                      </span>
                    )}
                  </span>
                  <span className="text-[10.5px] font-mono text-stone-400">
                    {formatDateTime(entry.at)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Courier Tracking */}
      {order.tracking_number && (
        <div className="border border-stone-200/80 p-5 flex items-center gap-4">
          <Truck size={18} strokeWidth={1.5} className="text-stone-400 shrink-0" />
          <div className="text-xs">
            <span className="uppercase tracking-widest text-stone-500 font-mono block text-[10px]">
              Courier Express Tracking ({order.carrier})
            </span>
            <span className="font-mono font-medium text-ink mt-0.5 block">{order.tracking_number}</span>
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="border border-stone-200/80">
        <div className="bg-stone-50 px-5 py-3 border-b border-stone-200/80 text-[11px] uppercase tracking-widest font-mono text-stone-500">
          Ensemble Items ({order.items.length})
        </div>
        <ul className="divide-y divide-stone-100">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 p-5">
              {item.image && (
                <img
                  src={item.image}
                  alt={item.product_name}
                  className="aspect-[4/5] w-14 object-cover border border-stone-200"
                />
              )}
              <div className="flex-1">
                <p className="text-xs font-medium text-ink">{item.product_name}</p>
                <p className="mt-1 text-[11px] text-stone-500 font-mono">
                  {item.color_name} · {item.size_name} · Qty {item.quantity}
                </p>
              </div>
              <span className="font-mono text-xs text-ink font-medium">
                {formatMoney(String(Number(item.unit_price) * item.quantity))}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Totals & Addresses Grid */}
      <div className="grid gap-6 sm:grid-cols-2 pt-2">
        {/* Addresses */}
        <div className="space-y-4">
          <AddressBlock title="Delivery Address" a={order.shipping_address} />
          {!order.billing_same_as_shipping && (
            <AddressBlock title="Billing Address" a={order.billing_address} />
          )}
        </div>

        {/* Order Totals Summary */}
        <div className="border border-stone-200/80 p-5 space-y-2.5 h-fit text-xs font-mono">
          <div className="flex justify-between text-stone-500">
            <span>Subtotal</span>
            <span>{formatMoney(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-stone-500">
            <span>Shipping</span>
            <span>{order.shipping === "0.00" ? "Complimentary" : formatMoney(order.shipping)}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-accent">
              <span>Discount {order.coupon_code && `(${order.coupon_code})`}</span>
              <span>−{formatMoney(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-stone-500">
            <span>Tax</span>
            <span>{formatMoney(order.tax)}</span>
          </div>
          <div className="flex justify-between border-t border-stone-200 pt-3 text-sm font-medium text-ink">
            <span>Total Paid</span>
            <span>{formatMoney(order.total)}</span>
          </div>
        </div>
      </div>

      {canCancel && (
        <div className="pt-4 border-t border-stone-200">
          <Button variant="outline" size="sm" onClick={() => cancel.mutate()} loading={cancel.isPending}>
            Cancel Order
          </Button>
          <p className="mt-2 text-[10.5px] text-stone-400">
            Orders may be cancelled while status is pending or paid before fulfillment.
          </p>
        </div>
      )}
    </div>
  );
}

function AddressBlock({
  title,
  a,
}: {
  title: string;
  a: {
    recipient: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone: string;
  };
}) {
  return (
    <div className="border border-stone-200/80 p-5 text-xs">
      <h3 className="text-[10.5px] uppercase tracking-widest text-stone-500 font-mono mb-2">{title}</h3>
      <p className="font-medium text-ink">{a.recipient}</p>
      <p className="text-stone-600 mt-1">{a.line1}</p>
      {a.line2 && <p className="text-stone-600">{a.line2}</p>}
      <p className="text-stone-600">
        {a.city}
        {a.state && `, ${a.state}`} {a.postal_code}
      </p>
      <p className="text-stone-600">{a.country}</p>
      <p className="mt-2 text-[11px] font-mono text-stone-400">{a.phone}</p>
    </div>
  );
}