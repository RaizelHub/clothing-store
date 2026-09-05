import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Check, Lock, Truck } from "lucide-react";
import { cardSchema, couponSchema, shippingSchema, type CardInput, type CouponInput, type ShippingInput } from "@/lib/validation";
import { useCart, useShippingQuote, useUpdateCartItem } from "@/hooks/useCart";
import { useSession } from "@/hooks/auth";
import { placeOrder } from "@/api/orders";
import { validateCoupon } from "@/api/cart";
import { Button } from "@/components/ui/Button";
import { Field, Input, Checkbox } from "@/components/ui/fields";
import { EmptyState, Notice, QuantityStepper, Skeleton } from "@/components/ui/misc";
import { formatMoney } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { CouponValidation, Order, ShippingQuote } from "@/types/api";

type Step = "contact" | "payment";

export function CheckoutPage() {
  const navigate = useNavigate();
  const { data: cart, isLoading } = useCart();
  const { data: quote } = useShippingQuote();
  const { data: me } = useSession();
  const updateItem = useUpdateCartItem();

  const [step, setStep] = useState<Step>("contact");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestEmailTouched, setGuestEmailTouched] = useState(false);
  const guestEmailValid = useMemo(() => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guestEmail.trim()), [guestEmail]);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [billing, setBilling] = useState<ShippingInput | null>(null);
  const [method, setMethod] = useState("standard");
  const [coupon, setCoupon] = useState<CouponValidation | null>(null);
  const [couponInputCode, setCouponInputCode] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  // Verified-email gate for signed-in customers.
  useEffect(() => {
    if (me && !me.email_verified) {
      navigate("/account", { state: { needsVerification: true } });
    }
  }, [me, navigate]);

  const shippingForm = useForm<ShippingInput>({
    resolver: zodResolver(shippingSchema),
    defaultValues: { recipient: "", line1: "", line2: "", city: "", state: "", postal_code: "", country: "Philippines", phone: "" },
  });
  const cardForm = useForm<CardInput>({
    resolver: zodResolver(cardSchema),
    defaultValues: { name: "", number: "", expiry: "", cvc: "" },
  });
  const couponForm = useForm<CouponInput>({ resolver: zodResolver(couponSchema) });
  const couponCode = useDebouncedValue(couponInputCode, 400);
  const skipCouponCheck = couponCode.trim().length < 3;

  const couponCheck = useMutation({
    mutationFn: (code: string) => validateCoupon(code),
    onSuccess: setCoupon,
  });
  useEffect(() => {
    if (!skipCouponCheck && couponCode.trim() !== (coupon?.code ?? "")) {
      couponCheck.mutate(couponCode);
    }
  }, [couponCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyCoupon = (values: CouponInput) => {
    setCouponInputCode(values.code);
    setCoupon(null);
    couponCheck.mutate(values.code, {
      onError: (e) => setServerError(getApiErrorMessage(e)),
    });
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponInputCode("");
    couponForm.reset();
  };

  const totals = useMemo(
    () => computeTotals(cart?.items ?? [], quote, method, coupon),
    [cart, quote, method, coupon]
  );



  const place = useMutation({
    mutationFn: () => {
      if (!cart || !cart.items.length) throw new Error("Bag is empty.");
      const card = cardForm.getValues();
      const address = shippingForm.getValues();
      const email = me?.email ?? guestEmail;
      const name = me ? `${me.first_name} ${me.last_name}`.trim() || address.recipient : address.recipient;
      return placeOrder({
        customer_email: email,
        customer_name: name,
        shipping_address: address,
        billing_address: sameAsShipping ? address : billing ?? address,
        billing_same_as_shipping: sameAsShipping,
        shipping_method: method,
        coupon_code: coupon?.valid ? coupon.code : null,
        payment: { provider: "paymongo", method: "card", number: card.number },
      });
    },
    onSuccess: (order: Order) => {
      navigate(`/checkout/success/${order.order_number}`, { state: { order } });
    },
    onError: (e) => setServerError(getApiErrorMessage(e)),
  });

  if (isLoading) {
    return (
      <section className="container-editorial py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </section>
    );
  }

  if (!cart?.items.length) {
    return (
      <section className="container-editorial py-24">
        <EmptyState
          title="Your bag is empty"
          body="Add a piece or two before checking out."
          action={
            <Link to="/new" className="text-sm uppercase tracking-widest underline underline-offset-4">
              Shop new arrivals
            </Link>
          }
        />
      </section>
    );
  }

  const contactComplete = Boolean(me) || guestEmailValid;

  return (
    <section className="container-editorial py-10 md:py-14">
      <h1 className="font-display text-4xl">Checkout</h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-10">
          {/* Step indicator */}
          <ol className="flex items-center gap-3 text-xs uppercase tracking-widest">
            <StepDot active={step === "contact"} done={contactComplete} label="Contact & delivery" />
            <span className="h-px flex-1 bg-stone-200" />
            <StepDot active={step === "payment"} done={step === "payment" && Boolean(place.isSuccess)} label="Payment" />
          </ol>

          {/* Step 1 — contact & shipping */}
          <div id="checkout-contact" className={cn(step !== "contact" && "hidden")}>
            {!me && (
              <div>
                <h2 className="font-display text-2xl">Contact</h2>
                <div className="mt-4 max-w-sm">
                  <Field
                    label="Email"
                    error={(guestEmailTouched || guestEmail.length > 0) && !guestEmailValid ? "Enter a valid email for order updates." : undefined}
                    hint="Order confirmation goes here. Guests checkout without an account."
                  >
                    <Input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      onBlur={() => setGuestEmailTouched(true)}
                      placeholder="you@example.com"
                    />
                  </Field>
                </div>
              </div>
            )}

            <div className="mt-8">
              <h2 className="font-display text-2xl">Delivery</h2>
              <form
                className="mt-4 grid max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2"
                onSubmit={(e) => e.preventDefault()}
                noValidate
              >
                <div className="sm:col-span-2">
                  <Field label="Recipient" error={shippingForm.formState.errors.recipient?.message}>
                    <Input {...shippingForm.register("recipient")} invalid={!!shippingForm.formState.errors.recipient} placeholder="Name for the door" />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Address line 1" error={shippingForm.formState.errors.line1?.message}>
                    <Input {...shippingForm.register("line1")} invalid={!!shippingForm.formState.errors.line1} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Address line 2" error={shippingForm.formState.errors.line2?.message} optional>
                    <Input {...shippingForm.register("line2")} invalid={!!shippingForm.formState.errors.line2} />
                  </Field>
                </div>
                <Field label="City" error={shippingForm.formState.errors.city?.message}>
                  <Input {...shippingForm.register("city")} invalid={!!shippingForm.formState.errors.city} />
                </Field>
                <Field label="State / region" error={shippingForm.formState.errors.state?.message} optional>
                  <Input {...shippingForm.register("state")} invalid={!!shippingForm.formState.errors.state} />
                </Field>
                <Field label="Postal code" error={shippingForm.formState.errors.postal_code?.message}>
                  <Input {...shippingForm.register("postal_code")} invalid={!!shippingForm.formState.errors.postal_code} />
                </Field>
                <Field label="Country" error={shippingForm.formState.errors.country?.message}>
                  <Input {...shippingForm.register("country")} invalid={!!shippingForm.formState.errors.country} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Phone" error={shippingForm.formState.errors.phone?.message}>
                    <Input {...shippingForm.register("phone")} invalid={!!shippingForm.formState.errors.phone} />
                  </Field>
                </div>
              </form>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-2xl">Shipping method</h2>
              <div className="mt-4 space-y-3">
                {quote?.methods.map((m) => {
                  const selected = method === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={cn(
                        "flex w-full items-center justify-between border px-5 py-4 text-left transition-colors duration-200",
                        selected ? "border-ink bg-paper" : "border-stone-200 hover:border-stone-400"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Truck size={16} strokeWidth={1.5} className="text-stone-400" />
                        <span>
                          <span className="block text-sm font-medium">{m.label}</span>
                          <span className="block text-xs text-stone-500">{m.eta}</span>
                        </span>
                      </span>
                      <span className="text-sm">
                        {m.price === "0.00" || (method === m.id && totals.freeShippingApplied) ? "Free" : formatMoney(m.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {quote?.free_shipping_threshold && (
                <p className="mt-3 text-xs text-stone-400">
                  Free standard shipping on orders over {formatMoney(quote.free_shipping_threshold)}.
                </p>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-stone-200 pt-6">
              <Link to="/" className="text-xs uppercase tracking-widest text-stone-500 hover:text-ink">
                ← Continue shopping
              </Link>
              <Button
                size="lg"
                onClick={async () => {
                  setGuestEmailTouched(true);
                  if (!me && !guestEmailValid) return;
                  const valid = await shippingForm.trigger();
                  if (valid) {
                    setStep("payment");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              >
                Continue to payment
              </Button>
            </div>
          </div>

          {/* Step 2 — payment */}
          <div id="checkout-payment" className={cn(step !== "payment" && "hidden")}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Payment</h2>
              <button
                className="text-xs uppercase tracking-widest text-stone-500 hover:text-ink"
                onClick={() => setStep("contact")}
              >
                ← Back to delivery
              </button>
            </div>

            {!sameAsShipping && (
              <div className="mt-6 max-w-2xl">
                <h3 className="text-sm uppercase tracking-widest">Billing address</h3>
                <ShippingAddressForm onChange={setBilling} />
              </div>
            )}

            <form
              className="mt-6 max-w-2xl"
              onSubmit={(e) => e.preventDefault()}
              noValidate
            >
              <div className="border border-stone-200 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm uppercase tracking-widest">
                    <Lock size={14} strokeWidth={1.5} /> Pay with card
                  </h3>
                  <span className="text-xs text-stone-400">via PayMongo</span>
                </div>
                <div className="mt-5 space-y-5">
                  <Field label="Name on card" error={cardForm.formState.errors.name?.message}>
                    <Input autoComplete="cc-name" invalid={!!cardForm.formState.errors.name} {...cardForm.register("name")} />
                  </Field>
                  <Field label="Card number" error={cardForm.formState.errors.number?.message}>
                    <Input
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="4242 4242 4242 4242"
                      invalid={!!cardForm.formState.errors.number}
                      {...cardForm.register("number")}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Expiry" error={cardForm.formState.errors.expiry?.message}>
                      <Input inputMode="numeric" placeholder="MM/YY" autoComplete="cc-exp" invalid={!!cardForm.formState.errors.expiry} {...cardForm.register("expiry")} />
                    </Field>
                    <Field label="CVC" error={cardForm.formState.errors.cvc?.message}>
                      <Input inputMode="numeric" placeholder="123" autoComplete="cc-csc" invalid={!!cardForm.formState.errors.cvc} {...cardForm.register("cvc")} />
                    </Field>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2">
                <Checkbox
                  label="Billing address same as shipping"
                  checked={sameAsShipping}
                  onChange={(e) => setSameAsShipping(e.target.checked)}
                />
              </div>

              {serverError && (
                <div className="mt-4">
                  <Notice tone="error">{serverError}</Notice>
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                <p className="text-xs text-stone-400">Test card: 4242 4242 4242 4242 · any future date · any CVC</p>
                <Button
                  size="lg"
                  loading={place.isPending}
                  onClick={() => {
                    cardForm.trigger().then((valid) => {
                      if (!valid) return;
                      if (!sameAsShipping && !billing) {
                        setServerError("Complete the billing address.");
                        return;
                      }
                      setServerError(null);
                      place.mutate();
                    });
                  }}
                >
                  Place order · {formatMoney(totals.total)}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Order summary */}
        <aside className="h-fit border border-stone-200 p-6 lg:sticky lg:top-28">
          <h2 className="text-sm uppercase tracking-widest">Order summary</h2>

          <ul className="mt-5 max-h-72 space-y-4 overflow-y-auto pr-1">
            {cart.items.map((item) => (
              <li key={item.id} className="flex gap-3">
                <div className="relative shrink-0">
                  {item.image && <img src={item.image} alt={item.product_name} className="aspect-[4/5] w-16 object-cover" />}
                  <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-ink text-[10px] text-paper">
                    {item.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{item.product_name}</p>
                  <p className="text-xs text-stone-500">
                    {item.variant.color.name} / {item.variant.size.name}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <QuantityStepper
                      value={item.quantity}
                      max={item.available_stock}
                      onChange={(q) => updateItem.mutate({ id: item.id, quantity: q })}
                    />
                  </div>
                </div>
                <span className="text-sm">{formatMoney(String(Number(item.unit_price) * item.quantity))}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <form onSubmit={couponForm.handleSubmit(applyCoupon)} className="flex gap-2">
              <Input placeholder="Discount code" {...couponForm.register("code")} />
              <Button type="submit" variant="outline" size="sm" loading={couponCheck.isPending}>
                Apply
              </Button>
            </form>
            {coupon && coupon.valid && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-ink">
                  {coupon.code} — {coupon.type === "percent" ? `${coupon.value}% off` : `${formatMoney(String(coupon.value))} off`}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-accent">−{formatMoney(coupon.discount)}</span>
                  <button onClick={removeCoupon} className="text-xs uppercase tracking-widest text-stone-400 hover:text-accent">
                    Remove
                  </button>
                </div>
              </div>
            )}
            {coupon && !coupon.valid && <p className="mt-2 text-xs text-accent">{coupon.error ?? "Invalid code."}</p>}
          </div>

          <div className="mt-6 space-y-2 border-t border-stone-200 pt-4 text-sm">
            <Row label="Subtotal" value={formatMoney(totals.subtotal)} />
            <Row label="Discount" value={totals.discount > 0 ? `−${formatMoney(totals.discount)}` : "—"} accent />
            <Row label="Shipping" value={totals.freeShippingApplied ? "Free" : formatMoney(totals.shipping)} />
            <Row label="Estimated tax" value={formatMoney(totals.tax)} />
            <div className="flex justify-between border-t border-stone-200 pt-3 font-display text-lg">
              <span>Total</span>
              <span>{formatMoney(totals.total)}</span>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-stone-400">
            By placing your order you agree to our terms. Payment is processed over a secure connection; no card details reach Studio's servers.
          </p>
        </aside>
      </div>
    </section>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full border text-[11px]",
          active ? "border-ink bg-ink text-paper" : done ? "border-ink text-ink" : "border-stone-300 text-stone-400"
        )}
      >
        {done && !active ? <Check size={12} strokeWidth={2} /> : active ? <span className="size-1.5 rounded-full bg-paper" /> : null}
      </span>
      <span className={cn(active ? "text-ink" : "text-stone-400")}>{label}</span>
    </li>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-stone-500">{label}</span>
      <span className={accent && value !== "—" ? "text-accent" : ""}>{value}</span>
    </div>
  );
}

function computeTotals(
  items: { unit_price: string; quantity: number }[],
  quote: ShippingQuote | undefined,
  method: string,
  coupon: CouponValidation | null
) {
  const subtotal = items.reduce((s, i) => s + Math.round(parseFloat(i.unit_price) * 100) * i.quantity, 0);
  const discount = coupon?.valid ? Math.round(parseFloat(coupon.discount) * 100) : 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const freeThreshold = quote?.free_shipping_threshold ? Math.round(parseFloat(quote.free_shipping_threshold) * 100) : null;
  const freeShippingApplied = freeThreshold !== null && afterDiscount >= freeThreshold && method === "standard";
  const quoted = quote?.methods.find((m) => m.id === method);
  const shipping = freeShippingApplied ? 0 : quoted ? Math.round(parseFloat(quoted.price) * 100) : 0;
  const tax = Math.round((afterDiscount + shipping) * (quote?.tax_rate ?? 0));
  return { subtotal, discount, shipping, tax, total: Math.max(0, afterDiscount) + shipping + tax, freeShippingApplied };
}

function ShippingAddressForm({ onChange }: { onChange: (a: ShippingInput) => void }) {
  const form = useForm<ShippingInput>({ resolver: zodResolver(shippingSchema) });
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" onBlur={() => onChange(form.getValues())}>
      <div className="sm:col-span-2">
        <Field label="Recipient" error={form.formState.errors.recipient?.message}>
          <Input {...form.register("recipient")} invalid={!!form.formState.errors.recipient} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Address line 1" error={form.formState.errors.line1?.message}>
          <Input {...form.register("line1")} invalid={!!form.formState.errors.line1} />
        </Field>
      </div>
      <Field label="City" error={form.formState.errors.city?.message}>
        <Input {...form.register("city")} invalid={!!form.formState.errors.city} />
      </Field>
      <Field label="State / region" error={form.formState.errors.state?.message} optional>
        <Input {...form.register("state")} invalid={!!form.formState.errors.state} />
      </Field>
      <Field label="Postal code" error={form.formState.errors.postal_code?.message}>
        <Input {...form.register("postal_code")} invalid={!!form.formState.errors.postal_code} />
      </Field>
      <Field label="Country" error={form.formState.errors.country?.message}>
        <Input {...form.register("country")} invalid={!!form.formState.errors.country} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Phone" error={form.formState.errors.phone?.message}>
          <Input {...form.register("phone")} invalid={!!form.formState.errors.phone} />
        </Field>
      </div>
    </div>
  );
}