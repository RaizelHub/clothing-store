import { Link } from "react-router-dom";
import { ArrowLeftRight, CheckCircle, ShieldCheck } from "lucide-react";

export function ReturnsPage() {
  return (
    <div className="container-editorial py-12 md:py-16 max-w-4xl">
      {/* Header */}
      <div className="border-b border-stone-200 pb-8 mb-10">
        <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mb-2">
          Customer Care & Service
        </p>
        <h1 className="text-3xl md:text-4xl font-serif text-ink tracking-tight mb-3">
          Returns &amp; Exchanges
        </h1>
        <p className="text-xs text-stone-500">
          Our 30-Day Atelier Guarantee &bull; Studio Atelier Manila
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="border border-stone-200/80 p-5 bg-stone-50/50 space-y-2">
          <ShieldCheck size={20} className="text-ink" strokeWidth={1.5} />
          <h3 className="text-xs uppercase tracking-wider font-semibold text-ink">30-Day Window</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Return or exchange any qualifying unworn garment within 30 days of delivery.
          </p>
        </div>
        <div className="border border-stone-200/80 p-5 bg-stone-50/50 space-y-2">
          <ArrowLeftRight size={20} className="text-ink" strokeWidth={1.5} />
          <h3 className="text-xs uppercase tracking-wider font-semibold text-ink">Seamless Swaps</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Complimentary size or color exchanges for all domestic Philippine orders.
          </p>
        </div>
        <div className="border border-stone-200/80 p-5 bg-stone-50/50 space-y-2">
          <CheckCircle size={20} className="text-ink" strokeWidth={1.5} />
          <h3 className="text-xs uppercase tracking-wider font-semibold text-ink">Original Gateway Refund</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Refunds are credited directly back to your original payment method (GCash, Maya, or Card).
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="prose prose-stone max-w-none text-xs md:text-sm leading-relaxed text-stone-700 space-y-8">
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            1. Return Eligibility Criteria
          </h2>
          <p>
            To qualify for a refund or exchange, all items must fulfill our inspection criteria:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
            <li>Unworn, unwashed, unaltered, and completely free of perfumes, makeup, or scent.</li>
            <li>In original packaging with all security ribbons and fabric tags intact.</li>
            <li>Accompanied by proof of purchase (Atelier Order Number or packing slip).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            2. Non-Returnable Items
          </h2>
          <p>For hygiene and craftsmanship reasons, the following cannot be returned or refunded:</p>
          <ul className="list-disc pl-5 space-y-1 text-stone-600">
            <li>Intimate apparel, lingerie, bodysuits, and swimwear without protective liner.</li>
            <li>Jewelry, earrings, and personalized/monogrammed goods.</li>
            <li>Items specifically marked as &ldquo;Final Sale&rdquo; or archive promotional pieces.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            3. How to Initiate a Return or Exchange
          </h2>
          <ol className="list-decimal pl-5 space-y-2 text-stone-600">
            <li>
              Navigate to your{" "}
              <Link to="/account/orders" className="text-ink underline">
                Orders History
              </Link>{" "}
              or contact our concierge with your order number.
            </li>
            <li>Our team will generate a prepaid LBC Express or DHL return airway bill.</li>
            <li>Securely pack your garment in the original Studio dust bag and box.</li>
            <li>Drop off the package at any authorized courier counter or request a home pickup.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            4. Refund Processing Timelines
          </h2>
          <p>
            Once inspected and approved by our atelier quality control team in Makati (usually within 2 business days of receipt):
          </p>
          <ul className="list-disc pl-5 space-y-1 text-stone-600">
            <li><strong>GCash &amp; Maya:</strong> Credited back within 24 to 48 hours.</li>
            <li><strong>Credit &amp; Debit Cards (Visa/Mastercard):</strong> Posted within 5 to 10 business days, depending on your issuing bank.</li>
            <li><strong>Direct Bank Transfers (BPI/UnionBank):</strong> Processed within 3 to 5 business days.</li>
          </ul>
        </section>

        <section className="pt-6 border-t border-stone-200">
          <p className="text-stone-500 text-xs">
            Need styling guidance before exchanging? Reach our{" "}
            <Link to="/contact" className="text-ink underline">
              Concierge Desk
            </Link>{" "}
            or email{" "}
            <a href="mailto:returns@studio-atelier.ph" className="text-ink underline">
              returns@studio-atelier.ph
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
