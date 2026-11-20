import { Link } from "react-router-dom";

export function TermsPage() {
  return (
    <div className="container-editorial py-12 md:py-16 max-w-4xl">
      {/* Header */}
      <div className="border-b border-stone-200 pb-8 mb-10">
        <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mb-2">
          Legal & Compliance
        </p>
        <h1 className="text-3xl md:text-4xl font-serif text-ink tracking-tight mb-3">
          Terms of Service
        </h1>
        <p className="text-xs text-stone-500">
          Last revised: November 2026 &bull; Studio Atelier Manila
        </p>
      </div>

      {/* Main Editorial Content */}
      <div className="prose prose-stone max-w-none text-xs md:text-sm leading-relaxed text-stone-700 space-y-8">
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            1. Overview & Acceptance
          </h2>
          <p>
            Welcome to Studio Atelier (&ldquo;Studio,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), operated in the Republic of the Philippines. By accessing or using our website, services, and online storefront located at studio-atelier.ph, you agree to be bound by these Terms of Service and all policies referenced herein.
          </p>
          <p>
            If you do not agree to all terms and conditions, please discontinue use of the site and services immediately.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            2. Atelier Accounts & Security
          </h2>
          <p>
            When registering an atelier customer account, you agree to provide true, accurate, and current information. You are responsible for maintaining the confidentiality of your account credentials and password. Studio reserves the right to suspend or terminate accounts that provide fraudulent information or engage in suspicious conduct.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            3. Products, Pricing & Currency
          </h2>
          <p>
            All products displayed in our collections are subject to stock availability. We strive to portray fabric textures, silhouettes, and color swatches as accurately as possible; however, actual colors may vary slightly depending on your screen calibration.
          </p>
          <p>
            Prices are stated in Philippine Pesos (PHP &bull; &#8369;) inclusive of applicable Philippine Value-Added Tax (VAT), unless explicitly indicated otherwise. We reserve the right to correct pricing errors or update pricing at any time prior to order confirmation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            4. Orders & Payment Processing
          </h2>
          <p>
            Placing an order constitutes an offer to purchase. An order is accepted only once verified and assigned an official Atelier Order Number.
          </p>
          <p>
            Payment transactions are processed securely through certified payment gateways, including PayMongo Philippines, Inc. (licensed by the Bangko Sentral ng Pilipinas) and authorized card networks (Visa, Mastercard, GCash, Maya, GrabPay, BPI, UnionBank). Studio Atelier does not store full credit card numbers or CVV codes on our servers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            5. Shipping & Title Transfer
          </h2>
          <p>
            Risk of loss and title for items purchased pass to the customer upon handover to our authorized delivery partners (LBC Express, J&T Express, or DHL Express). For detailed timelines, consult our{" "}
            <Link to="/shipping-policy" className="text-ink underline hover:text-stone-500">
              Shipping &amp; Delivery Policy
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            6. Returns & Exchanges
          </h2>
          <p>
            Eligible garments in unworn, unwashed condition with original atelier tags attached may be returned within thirty (30) days of receipt. Intimate apparel, customized alterations, and final sale items are strictly non-returnable. Please review our{" "}
            <Link to="/returns" className="text-ink underline hover:text-stone-500">
              Returns &amp; Refund Policy
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            7. Intellectual Property
          </h2>
          <p>
            All content on this site&mdash;including garment designs, photography, imagery, editorial text, logos, trademarks, and code&mdash;is the exclusive intellectual property of Studio Atelier and protected under the Intellectual Property Code of the Philippines (Republic Act No. 8293) and international conventions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            8. Governing Law & Dispute Resolution
          </h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any legal action or proceeding arising out of these Terms shall be instituted exclusively in the competent courts of Makati City, Metro Manila.
          </p>
        </section>

        <section className="pt-6 border-t border-stone-200">
          <p className="text-stone-500 text-xs">
            Questions regarding our Terms of Service should be directed to{" "}
            <a href="mailto:legal@studio-atelier.ph" className="text-ink underline">
              legal@studio-atelier.ph
            </a>{" "}
            or via our{" "}
            <Link to="/contact" className="text-ink underline">
              Concierge Client Services
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
