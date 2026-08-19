import { Link, useNavigate } from "react-router-dom";
import { useCart, useRemoveCartItem, useShippingQuote, useUpdateCartItem } from "@/hooks/useCart";
import { useUIStore } from "@/store/useUIStore";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { QuantityStepper, Skeleton } from "@/components/ui/misc";
import { formatMoney } from "@/lib/format";
import { useSession } from "@/hooks/auth";
import { ArrowRight, ShoppingBag, Truck } from "lucide-react";

export function CartDrawer() {
  const isOpen = useUIStore((s) => s.isCartDrawerOpen);
  const close = useUIStore((s) => s.closeCartDrawer);
  const { data: cart, isLoading, isError } = useCart();
  const { data: quote } = useShippingQuote();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const navigate = useNavigate();
  const { data: me } = useSession();

  const shipping = cart && quote ? shippingProgress(cart.subtotal, quote.free_shipping_threshold) : null;

  return (
    <Drawer
      open={isOpen}
      onClose={close}
      title="Shopping Bag"
      footer={
        cart && cart.items.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between border-t border-stone-200/80 pt-4">
              <span className="text-[11px] uppercase tracking-widest text-stone-500 font-medium">
                Estimated Subtotal
              </span>
              <span className="font-mono text-base font-medium text-ink">
                {formatMoney(cart.subtotal)}
              </span>
            </div>
            <Button
              fullWidth
              size="lg"
              className="py-4 font-medium"
              onClick={() => {
                close();
                navigate("/checkout");
              }}
            >
              Proceed to Checkout <ArrowRight size={14} />
            </Button>
            <p className="text-center text-[10.5px] text-stone-400 font-mono">
              Complimentary carbon-neutral packaging included with every order.
            </p>
          </div>
        ) : undefined
      }
    >
      {/* Dynamic Free Shipping Threshold Progress */}
      {shipping && cart && cart.items.length > 0 && (
        <div className="border-b border-stone-200/80 bg-stone-50/60 px-6 py-4">
          {shipping.free ? (
            <div className="flex items-center gap-2 text-xs text-ink font-medium">
              <Truck size={14} className="text-ink" />
              <span>You've unlocked complimentary express shipping.</span>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span>Add <strong className="font-mono text-ink">{formatMoney(shipping.remaining)}</strong> for complimentary delivery</span>
                <span className="font-mono text-[11px] text-stone-400">{shipping.pct}%</span>
              </div>
              <div className="mt-2.5 h-1 w-full bg-stone-200 overflow-hidden">
                <div
                  className="h-full bg-ink transition-all duration-600 ease-editorial"
                  style={{ width: `${shipping.pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="space-y-6 p-6">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="aspect-[4/5] w-20" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <p className="p-6 text-xs text-accent">Unable to sync bag. Please refresh your session.</p>
      )}

      {/* Empty Bag State */}
      {cart && !cart.items.length && (
        <div className="flex flex-col items-center px-6 py-24 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-stone-100 mb-4 text-stone-400">
            <ShoppingBag size={20} strokeWidth={1.5} />
          </div>
          <h3 className="font-display text-2xl text-ink">Your bag is empty</h3>
          <p className="mt-2 max-w-xs text-xs text-stone-500 leading-relaxed">
            {me
              ? "Your selected pieces will appear here."
              : "Sign in to carry your bag across devices, or discover our core collection."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-6"
            onClick={() => {
              close();
              navigate("/new");
            }}
          >
            Explore Capsule 01
          </Button>
        </div>
      )}

      {/* Bag Items List */}
      {cart && cart.items.length > 0 && (
        <ul className="divide-y divide-stone-100">
          {cart.items.map((item) => (
            <li key={item.id} className="flex gap-4 p-6 transition-colors hover:bg-stone-50/40">
              <Link
                to={`/products/${item.product_slug}`}
                onClick={close}
                className="block aspect-[4/5] w-20 shrink-0 overflow-hidden bg-stone-100 border border-stone-200/80"
              >
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.product_name}
                    className="size-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                )}
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      to={`/products/${item.product_slug}`}
                      onClick={close}
                      className="text-xs font-normal text-ink line-clamp-1 hover:text-stone-600 transition-colors"
                    >
                      {item.product_name}
                    </Link>
                    <p className="mt-1 text-[11px] text-stone-500 font-mono">
                      {item.variant.color.name} · {item.variant.size.name}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-ink">{formatMoney(item.unit_price)}</span>
                </div>

                <div className="mt-auto flex items-center justify-between pt-4">
                  <QuantityStepper
                    value={item.quantity}
                    max={item.available_stock}
                    onChange={(q) => update.mutate({ id: item.id, quantity: q })}
                  />
                  <button
                    onClick={() => remove.mutate(item.id)}
                    className="text-[10.5px] uppercase tracking-widest text-stone-400 transition-colors hover:text-accent font-mono"
                  >
                    Remove
                  </button>
                </div>
                {item.quantity >= item.available_stock && (
                  <p className="mt-1.5 text-[10px] text-accent font-mono">
                    Max inventory limit reached: {item.available_stock} available
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}

function shippingProgress(subtotal: string, threshold: string | null) {
  const THRESHOLD = threshold ? Math.round(parseFloat(threshold) * 100) : null;
  if (THRESHOLD === null) return null;
  const subtotalCents = Math.round(parseFloat(subtotal) * 100);
  const pct = Math.min(100, Math.round((subtotalCents / THRESHOLD) * 100));
  return { pct, remaining: Math.max(0, THRESHOLD - subtotalCents), free: subtotalCents >= THRESHOLD };
}