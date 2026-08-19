import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { newsletterSchema, type NewsletterInput } from "@/lib/validation";
import { subscribeNewsletter } from "@/api/content";
import { getApiErrorMessage } from "@/lib/errors";
import { Check, ArrowRight } from "lucide-react";

export function Footer() {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
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
    <footer className="mt-28 sm:mt-36 border-t border-stone-200/80 bg-paper">
      <div className="container-editorial py-16 sm:py-20">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 md:grid-cols-5 lg:gap-16">
          {/* Brand Philosophy */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex flex-col">
              <span className="font-display text-2xl font-normal tracking-[0.25em] text-ink">
                STUDIO
              </span>
              <span className="text-[9px] uppercase tracking-[0.35em] text-stone-400 -mt-1 font-sans">
                Atelier
              </span>
            </div>
            <p className="text-xs leading-relaxed text-stone-600 max-w-sm">
              An independent clothing atelier dedicated to noble materials, quiet precision, and non-seasonal design. Handcrafted with European fabrics.
            </p>
            <div className="pt-2 text-[10px] uppercase tracking-widest text-stone-400">
              Paris · Milan · New York · London
            </div>
          </div>

          {/* Column 1: Collections */}
          <div>
            <h3 className="mb-4 text-[11px] font-medium uppercase tracking-widest text-ink">
              Collections
            </h3>
            <ul className="space-y-3 text-xs text-stone-600">
              <li>
                <Link to="/new" className="transition-colors hover:text-ink">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link to="/women" className="transition-colors hover:text-ink">
                  Women's Line
                </Link>
              </li>
              <li>
                <Link to="/men" className="transition-colors hover:text-ink">
                  Men's Line
                </Link>
              </li>
              <li>
                <Link to="/collections" className="transition-colors hover:text-ink">
                  Curated Capsules
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Client Services */}
          <div>
            <h3 className="mb-4 text-[11px] font-medium uppercase tracking-widest text-ink">
              Client Service
            </h3>
            <ul className="space-y-3 text-xs text-stone-600">
              <li>
                <Link to="/account/orders" className="transition-colors hover:text-ink">
                  Order Status & Tracking
                </Link>
              </li>
              <li>
                <Link to="/account/addresses" className="transition-colors hover:text-ink">
                  Shipping & Delivery
                </Link>
              </li>
              <li>
                <Link to="/account" className="transition-colors hover:text-ink">
                  Customer Profile
                </Link>
              </li>
              <li>
                <Link to="/admin" className="transition-colors hover:text-ink text-stone-400">
                  Atelier Administration
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Private Access Newsletter */}
          <div>
            <h3 className="mb-4 text-[11px] font-medium uppercase tracking-widest text-ink">
              Private Access
            </h3>
            <p className="mb-3 text-xs text-stone-500 leading-relaxed">
              Curated previews, seasonal capsule releases, and atelier dispatches.
            </p>
            {result?.ok ? (
              <div className="flex items-center gap-2 rounded bg-stone-100 p-2.5 text-xs text-stone-900 border border-stone-200 animate-fade-in">
                <Check size={14} className="text-success" />
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
                {errors.email && <p className="text-[10.5px] text-accent">{errors.email.message}</p>}
              </form>
            )}
          </div>
        </div>

        {/* Bottom copyright & payment marks */}
        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-stone-200/80 pt-8 text-[11px] text-stone-400">
          <span>© {new Date().getFullYear()} Studio Atelier. All rights reserved.</span>
          <div className="flex items-center gap-6 text-[10px] uppercase tracking-widest text-stone-400">
            <span>Visa</span>
            <span>Mastercard</span>
            <span>Amex</span>
            <span>Apple Pay</span>
          </div>
        </div>
      </div>
    </footer>
  );
}