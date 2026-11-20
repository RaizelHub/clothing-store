import { Link } from "react-router-dom";

export function PrivacyPage() {
  return (
    <div className="container-editorial py-12 md:py-16 max-w-4xl">
      {/* Header */}
      <div className="border-b border-stone-200 pb-8 mb-10">
        <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mb-2">
          Legal & Compliance
        </p>
        <h1 className="text-3xl md:text-4xl font-serif text-ink tracking-tight mb-3">
          Privacy Policy
        </h1>
        <p className="text-xs text-stone-500">
          Compliant with Republic Act No. 10173 (Data Privacy Act of 2012) &bull; Studio Atelier Manila
        </p>
      </div>

      {/* Main Privacy Body */}
      <div className="prose prose-stone max-w-none text-xs md:text-sm leading-relaxed text-stone-700 space-y-8">
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            1. Commitment to Client Confidentiality
          </h2>
          <p>
            At Studio Atelier, your privacy is treated with the same meticulous care as our garments. We are fully committed to protecting your personal data in strict compliance with the Data Privacy Act of 2012 (Republic Act No. 10173), its Implementing Rules and Regulations, and National Privacy Commission (NPC) circulars.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            2. Personal Information We Collect
          </h2>
          <p>We collect information necessary to fulfill your orders, provide styling concierge, and enhance your digital experience:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
            <li><strong>Identity &amp; Contact:</strong> Full name, email address, contact telephone number.</li>
            <li><strong>Delivery Information:</strong> Shipping address, delivery instructions, recipient name.</li>
            <li><strong>Transaction Records:</strong> Items purchased, order numbers, payment confirmation IDs, dates and timestamps.</li>
            <li><strong>Technical Data:</strong> IP address, device type, browser metadata, and cookie preferences used for session security.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            3. Payment Processing &amp; Card Security
          </h2>
          <p>
            We adhere to strict PCI-DSS standards. When paying via credit card, e-wallet (GCash, Maya, GrabPay), or direct banking (BPI, UnionBank), transactions are securely tokenized and processed through PayMongo Philippines, Inc.
          </p>
          <div className="bg-stone-50 border border-stone-200/80 p-4 rounded text-xs text-stone-600">
            <strong>Security Guarantee:</strong> Studio Atelier never stores raw credit card numbers, CVVs, or bank login credentials on our servers. All transaction payloads are encrypted with TLS 1.3.
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            4. How We Use Your Data
          </h2>
          <p>Your personal data is used solely for the following legitimate purposes:</p>
          <ul className="list-disc pl-5 space-y-1 text-stone-600">
            <li>Processing, verifying, and dispatching your orders.</li>
            <li>Communicating transactional order updates, tracking information, and receipts.</li>
            <li>Responding to customer service and sizing inquiries.</li>
            <li>Delivering our curated newsletter (only with your explicit opt-in consent; you may unsubscribe at any time).</li>
            <li>Preventing fraud and securing our checkout infrastructure.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            5. Disclosure to Third Parties
          </h2>
          <p>
            We do not sell, rent, or trade your personal information. Data is shared exclusively with vetted partners strictly necessary to provide our services:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-stone-600">
            <li><strong>Payment Gateways:</strong> PayMongo Philippines, Inc. for transaction processing.</li>
            <li><strong>Logistics Couriers:</strong> LBC Express, J&T Express, and DHL Express for parcel delivery.</li>
            <li><strong>Cloud Infrastructure:</strong> Cloudinary for encrypted media delivery.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            6. Your Rights Under Philippine Data Privacy Law
          </h2>
          <p>
            Under RA 10173, you hold the right to be informed, right of access, right to rectification, right to erasure or blocking, right to damages, and right to data portability.
          </p>
          <p>
            To exercise any of these rights, or to request permanent deletion of your customer profile, email our appointed Data Protection Officer at{" "}
            <a href="mailto:privacy@studio-atelier.ph" className="text-ink underline">
              privacy@studio-atelier.ph
            </a>
            .
          </p>
        </section>

        <section className="pt-6 border-t border-stone-200">
          <p className="text-stone-500 text-xs">
            Have questions about how your data is handled? Reach out through our{" "}
            <Link to="/contact" className="text-ink underline">
              Concierge Contact Page
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
