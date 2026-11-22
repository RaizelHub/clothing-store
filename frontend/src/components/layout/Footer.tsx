import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { newsletterSchema, type NewsletterInput } from "@/lib/validation";
import { subscribeNewsletter } from "@/api/content";
import { getApiErrorMessage } from "@/lib/errors";
import { Check, ArrowRight } from "lucide-react";

export function Footer() {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterInput>({ resolver: zodResolver(newsletterSchema) });

  const onSubmit = async (values: NewsletterInput) => {
    try {
      const res = await subscribeNewsletter(values.email);
      setResult(res);
      if (res.ok) reset();
    } catch (e) {
      setResult({ ok: false, message: getApiErrorMessage(e) });
    }
  };

  return (
    <footer className="studio-footer mt-20 sm:mt-24 border-t border-stone-200/80 bg-stone-50/40">
      <div className="container-editorial py-16 sm:py-20">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-6 lg:gap-12">
          {/* Brand Philosophy */}
          <div className="sm:col-span-2 md:col-span-2 space-y-4">
            <div className="flex flex-col">
              <span className="footer-wordmark">studio</span>
              <span className="text-[9px] uppercase tracking-[0.35em] text-stone-400 -mt-1 font-sans">
                Atelier &bull; Manila
              </span>
            </div>
            <p className="text-xs leading-relaxed text-stone-600 max-w-sm">
              Thoughtful wardrobe essentials for whatever your day holds. Designed in Manila, crafted with integrity, made to be worn on repeat.
            </p>
            <div className="text-[11px] text-stone-400 leading-relaxed">
              118 Legaspi St., Legaspi Village, Makati City<br />
              Mon&ndash;Sat 9:00 AM &ndash; 7:00 PM PHT
            </div>
          </div>

          {/* Column 1: Collections */}
          <div>
            <h3 className="mb-4 text-[11px] font-medium uppercase tracking-widest text-ink">
              Collections
            </h3>
            <ul className="space-y-2.5 text-xs text-stone-600">
              <li>
                <Link to="/new" className="transition-colors hover:text-ink">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link to="/women" className="transition-colors hover:text-ink">
                  For her
                </Link>
              </li>
              <li>
                <Link to="/men" className="transition-colors hover:text-ink">
                  For him
                </Link>
              </li>
              <li>
                <Link
                  to="/collections"
                  className="transition-colors hover:text-ink"
                >
                  Seasonal Edits
                </Link>
              </li>
              <li>
                <Link
                  to="/looks"
                  className="transition-colors hover:text-ink"
                >
                  Shop the Look
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Client Care */}
          <div>
            <h3 className="mb-4 text-[11px] font-medium uppercase tracking-widest text-ink">
              Client Care
            </h3>
            <ul className="space-y-2.5 text-xs text-stone-600">
              <li>
                <Link
                  to="/contact"
                  className="transition-colors hover:text-ink"
                >
                  Atelier Concierge
                </Link>
              </li>
              <li>
                <Link
                  to="/account/orders"
                  className="transition-colors hover:text-ink"
                >
                  Order Tracking
                </Link>
              </li>
              <li>
                <Link
                  to="/shipping-policy"
                  className="transition-colors hover:text-ink"
                >
                  Shipping &amp; Delivery
                </Link>
              </li>
              <li>
                <Link
                  to="/returns"
                  className="transition-colors hover:text-ink"
                >
                  Returns &amp; Exchanges
                </Link>
              </li>
              <li>
                <Link
                  to="/account"
                  className="transition-colors hover:text-ink"
                >
                  Customer Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Compliance */}
          <div>
            <h3 className="mb-4 text-[11px] font-medium uppercase tracking-widest text-ink">
              Legal
            </h3>
            <ul className="space-y-2.5 text-xs text-stone-600">
              <li>
                <Link
                  to="/terms"
                  className="transition-colors hover:text-ink"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="transition-colors hover:text-ink"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/returns"
                  className="transition-colors hover:text-ink"
                >
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/shipping-policy"
                  className="transition-colors hover:text-ink"
                >
                  Delivery Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/admin"
                  className="transition-colors hover:text-ink text-stone-400"
                >
                  Atelier Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          <div className="sm:col-span-2 md:col-span-1">
            <h3 className="mb-4 text-[11px] font-medium uppercase tracking-widest text-ink">
              Stay in Touch
            </h3>
            <p className="mb-3 text-xs text-stone-500 leading-relaxed">
              New arrivals, private atelier events, and styling inspiration for your inbox.
            </p>
            {result?.ok ? (
              <div className="flex items-center gap-2 rounded bg-stone-100 p-2.5 text-xs text-stone-900 border border-stone-200 animate-fade-in">
                <Check size={14} className="text-success shrink-0" />
                <span>{result.message}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
                <div className="flex">
                  <input
                    type="email"
                    placeholder="Enter email address"
                    aria-label="Email address for newsletter"
                    {...register("email")}
                    className="w-full border-b border-stone-300 bg-transparent py-2 text-xs placeholder:text-stone-400 focus:border-ink focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    disabled={isSubmitting}
                    className="border-b border-stone-300 px-3 py-2 text-xs uppercase tracking-widest text-ink transition-colors hover:border-ink hover:text-stone-600 disabled:opacity-50"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
                {result && !result.ok && (
                  <p role="alert" className="text-xs text-accent">
                    {result.message}
                  </p>
                )}
                {errors.email && (
                  <p className="text-[10.5px] text-accent">
                    {errors.email.message}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Bottom copyright & payment marks */}
        <div className="mt-16 flex flex-wrap items-center justify-between gap-6 border-t border-stone-200/80 pt-8 text-[11px] text-stone-400">
          <span>
            &copy; {new Date().getFullYear()} Studio Atelier Manila. All rights reserved.
          </span>
          <div className="flex flex-wrap items-center gap-4 sm:gap-5 text-[10px] uppercase tracking-wider text-stone-500">
            <span>Visa</span>
            <span>Mastercard</span>
            <span>GCash</span>
            <span>Maya</span>
            <span>GrabPay</span>
            <span>BPI</span>
            <span>UnionBank</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
