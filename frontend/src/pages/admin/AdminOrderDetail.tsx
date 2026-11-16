import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminOrder, updateAdminOrder } from "@/api/admin";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/fields";
import { Notice } from "@/components/ui/misc";
import { formatDateTime, formatMoney } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/errors";
import type { OrderStatus } from "@/types/api";
import { ORDER_STATUSES, TERMINAL_STATUSES } from "@/types/api";

export function AdminOrderDetail() {
  const { orderNumber = "" } = useParams();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ["admin", "orders", orderNumber],
    queryFn: () => getAdminOrder(orderNumber),
    enabled: Boolean(orderNumber),
  });

  const [status, setStatus] = useState<OrderStatus>("pending");
  const [note, setNote] = useState("");
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");

  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setTracking(order.tracking_number ?? "");
      setCarrier(order.carrier ?? "");
    }
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: () =>
      updateAdminOrder(orderNumber, {
        status: status !== order?.status ? status : undefined,
        note: note || undefined,
        tracking_number: tracking || null,
        carrier: carrier || null,
      }),
    onSuccess: (updated) => {
      setMessage({ ok: true, text: "Order updated." });
      queryClient.setQueryData(["admin", "orders", orderNumber], updated);
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      setNote("");
    },
    onError: (e) => setMessage({ ok: false, text: getApiErrorMessage(e) }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse bg-stone-200" />
        <div className="h-64 animate-pulse bg-stone-200" />
      </div>
    );
  }

  if (!order) return <p className="text-sm text-accent">Order not found.</p>;

  const updateStatusState = (s: OrderStatus) => {
    setStatus(s);
    if (s === "shipped" || s === "delivered") {
      setTracking(order.tracking_number ?? "");
      setCarrier(order.carrier ?? "DHL Express");
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin/orders" className="text-xs uppercase tracking-widest text-stone-500 hover:text-ink">
            ← Orders
          </Link>
          <h1 className="mt-2 font-display text-3xl">{order.order_number}</h1>
          <p className="mt-1 text-xs text-stone-500">
            Placed {formatDateTime(order.created_at)} · {order.customer_name ?? order.customer_email ?? "Guest"}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </header>

      {message && (
        <div>
          <Notice tone={message.ok ? "success" : "error"}>{message.text}</Notice>
        </div>
      )}

      {/* Status update */}
      <section className="border border-stone-200 p-6">
        <h2 className="text-xs uppercase tracking-widest text-stone-500">Update status</h2>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {ORDER_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => updateStatusState(s)}
              className={
                "border px-3 py-1.5 text-xs uppercase tracking-widest transition-colors " +
                (status === s ? "border-ink bg-ink text-paper" : "border-stone-300 text-stone-500 hover:border-ink")
              }
            >
              {s}
            </button>
          ))}
        </div>
        {status !== order.status && (
          <div className="mt-4">
            <Field
              label={status === "paid" && order.status !== "paid" ? "Audit Justification (Required to manually mark paid)" : "Note (optional)"}
              optional={status !== "paid" || order.status === "paid"}
            >
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={status === "paid" && order.status !== "paid" ? "e.g. Verified bank deposit receipt #12345" : "e.g. Left with concierge"}
              />
            </Field>
          </div>
        )}
        {(status === "shipped" || status === "delivered") && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Carrier">
              <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="DHL Express" />
            </Field>
            <Field label="Tracking number" optional>
              <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="PM0000000000" />
            </Field>
          </div>
        )}
        {status !== order.status && (
          <div className="mt-5 flex items-center gap-4">
            <Button
              onClick={() => {
                if (status === "paid" && order.status !== "paid" && !note.trim()) {
                  setMessage({ ok: false, text: "An auditable note is required to manually mark an order as paid." });
                  return;
                }
                save.mutate();
              }}
              loading={save.isPending}
              disabled={
                (TERMINAL_STATUSES.includes(order.status) && status !== order.status) ||
                (status === "paid" && order.status !== "paid" && !note.trim())
              }
            >
              Save update
            </Button>
            {TERMINAL_STATUSES.includes(order.status) && (
              <p className="text-xs text-stone-400">This order is in a terminal state.</p>
            )}
          </div>
        )}
      </section>

      {/* Payment details */}
      <section className="border border-stone-200 p-6 text-sm">
        <h2 className="text-xs uppercase tracking-widest text-stone-500">Payment details</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="block text-xs text-stone-400">Provider</span>
            <span className="mt-1 block font-mono text-sm uppercase">{order.payment_provider || "mock"}</span>
          </div>
          <div>
            <span className="block text-xs text-stone-400">Payment Status</span>
            <span className="mt-1 block text-sm font-medium capitalize text-ink">{order.payment_status || order.status}</span>
          </div>
          <div>
            <span className="block text-xs text-stone-400">Session / Reference</span>
            <span className="mt-1 block truncate font-mono text-xs text-stone-600">{order.payment_reference || "—"}</span>
          </div>
          <div>
            <span className="block text-xs text-stone-400">Transaction ID</span>
            <span className="mt-1 block truncate font-mono text-xs text-stone-600">{order.payment_transaction_id || "—"}</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-between border-t border-stone-100 pt-3 text-xs text-stone-500">
          <span>Method: <strong className="font-normal text-stone-700">{order.payment_method || "Online"}</strong></span>
          <span>Stock: <strong className="font-normal text-stone-700">{order.is_stock_deducted ? "Inventory Deducted" : "Stock Not Reserved"}</strong></span>
        </div>
      </section>

      {/* Timeline */}
      <section className="border border-stone-200 p-6">
        <h2 className="text-xs uppercase tracking-widest text-stone-500">Timeline</h2>
        <ol className="mt-4 space-y-3">
          {[...order.timeline].reverse().map((entry, i) => (
            <li key={i} className="flex items-baseline gap-4 text-sm">
              <span className="w-2 shrink-0">
                {i === 0 ? <span className="block size-2 rounded-full bg-ink" /> : <span className="block size-2 rounded-full border border-stone-300" />}
              </span>
              <span className="flex-1 capitalize">
                {entry.status}
                {entry.note && <span className="ml-2 text-xs font-normal text-stone-400">— {entry.note}</span>}
              </span>
              <span className="text-xs text-stone-400">{formatDateTime(entry.at)}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Items */}
      <section className="border border-stone-200">
        <ul className="divide-y divide-stone-100">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 px-5 py-4 text-sm">
              {item.image && <img src={item.image} alt="" className="aspect-[4/5] w-12 object-cover" />}
              <div className="flex-1">
                <p className="font-medium">{item.product_name}</p>
                <p className="text-xs text-stone-500">
                  {item.color_name} / {item.size_name} · {item.sku} × {item.quantity}
                </p>
              </div>
              <span>{formatMoney(String(Number(item.unit_price) * item.quantity))}</span>
            </li>
          ))}
        </ul>
        <div className="max-w-xs space-y-1.5 border-t border-stone-200 p-5 text-sm">
          <Row label="Subtotal" value={formatMoney(order.subtotal)} />
          <Row label="Discount" value={Number(order.discount) > 0 ? `−${formatMoney(order.discount)}` : "—"} />
          <Row label="Shipping" value={order.shipping === "0.00" ? "Free" : formatMoney(order.shipping)} />
          <Row label="Tax" value={formatMoney(order.tax)} />
          <div className="flex justify-between border-t border-stone-200 pt-2 font-display text-lg">
            <span>Total</span>
            <span>{formatMoney(order.total)}</span>
          </div>
        </div>
      </section>

      {/* Addresses */}
      <div className="grid gap-6 sm:grid-cols-2">
        <AddressBlock title="Shipping" a={order.shipping_address} />
        {!order.billing_same_as_shipping && <AddressBlock title="Billing" a={order.billing_address} />}
      </div>

      {order.tracking_number && (
        <section className="border border-stone-200 p-6 text-sm">
          <h2 className="text-xs uppercase tracking-widest text-stone-500">Tracking</h2>
          <p className="mt-2">
            {order.carrier} — <span className="font-medium">{order.tracking_number}</span>
          </p>
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-stone-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function AddressBlock({
  title,
  a,
}: {
  title: string;
  a: { recipient: string; line1: string; line2: string; city: string; state: string; postal_code: string; country: string; phone: string };
}) {
  return (
    <div className="border border-stone-200 p-5 text-sm">
      <h2 className="text-xs uppercase tracking-widest text-stone-500">{title}</h2>
      <p className="mt-3">{a.recipient}</p>
      <p>{a.line1}</p>
      {a.line2 && <p>{a.line2}</p>}
      <p>
        {a.city}
        {a.state && `, ${a.state}`} {a.postal_code}
      </p>
      <p>{a.country}</p>
      <p className="mt-2 text-stone-500">{a.phone}</p>
    </div>
  );
}