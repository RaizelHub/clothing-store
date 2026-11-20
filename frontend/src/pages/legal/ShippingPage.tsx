import { Link } from "react-router-dom";
import { Truck, Globe, Clock, PackageCheck } from "lucide-react";

export function ShippingPage() {
  return (
    <div className="container-editorial py-12 md:py-16 max-w-4xl">
      {/* Header */}
      <div className="border-b border-stone-200 pb-8 mb-10">
        <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mb-2">
          Customer Care & Service
        </p>
        <h1 className="text-3xl md:text-4xl font-serif text-ink tracking-tight mb-3">
          Shipping &amp; Delivery Policy
        </h1>
        <p className="text-xs text-stone-500">
          Domestic Philippine Logistics &amp; Worldwide Dispatch &bull; Studio Atelier Manila
        </p>
      </div>

      {/* Grid Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <div className="border border-stone-200/80 p-4 bg-stone-50/50 space-y-2">
          <Truck size={18} className="text-ink" strokeWidth={1.5} />
          <h3 className="text-xs uppercase tracking-wider font-semibold text-ink">Free Domestic</h3>
          <p className="text-xs text-stone-600">
            Complimentary shipping on Philippine orders over &#8369;3,500.
          </p>
        </div>
        <div className="border border-stone-200/80 p-4 bg-stone-50/50 space-y-2">
          <Clock size={18} className="text-ink" strokeWidth={1.5} />
          <h3 className="text-xs uppercase tracking-wider font-semibold text-ink">Metro Manila</h3>
          <p className="text-xs text-stone-600">
            Express delivery in 1–2 business days from our Makati studio.
          </p>
        </div>
        <div className="border border-stone-200/80 p-4 bg-stone-50/50 space-y-2">
          <Globe size={18} className="text-ink" strokeWidth={1.5} />
          <h3 className="text-xs uppercase tracking-wider font-semibold text-ink">Worldwide (DHL)</h3>
          <p className="text-xs text-stone-600">
            Priority worldwide delivery within 3–7 business days.
          </p>
        </div>
        <div className="border border-stone-200/80 p-4 bg-stone-50/50 space-y-2">
          <PackageCheck size={18} className="text-ink" strokeWidth={1.5} />
          <h3 className="text-xs uppercase tracking-wider font-semibold text-ink">Tracked Parcels</h3>
          <p className="text-xs text-stone-600">
            Real-time airway bill tracking delivered to your inbox upon dispatch.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="prose prose-stone max-w-none text-xs md:text-sm leading-relaxed text-stone-700 space-y-8">
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            1. Domestic Philippine Delivery Options
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-stone-200 divide-y divide-stone-200">
              <thead className="bg-stone-50 text-stone-600 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Destination</th>
                  <th className="p-3">Transit Time</th>
                  <th className="p-3">Courier Partner</th>
                  <th className="p-3">Standard Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                <tr>
                  <td className="p-3 font-medium">Metro Manila (NCR)</td>
                  <td className="p-3">1–3 business days</td>
                  <td className="p-3">LBC Express / J&amp;T / Same-Day Courier</td>
                  <td className="p-3">&#8369;150.00 (Free over &#8369;3,500)</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Luzon (Provincial)</td>
                  <td className="p-3">3–5 business days</td>
                  <td className="p-3">LBC Express / J&amp;T Express</td>
                  <td className="p-3">&#8369;220.00 (Free over &#8369;3,500)</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Visayas &amp; Mindanao</td>
                  <td className="p-3">5–7 business days</td>
                  <td className="p-3">LBC Express Air Cargo</td>
                  <td className="p-3">&#8369;280.00 (Free over &#8369;3,500)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            2. International Shipping (Worldwide)
          </h2>
          <p>
            We ship to over 120 destinations globally via DHL Express. International delivery takes approximately 3 to 7 business days from dispatch.
          </p>
          <p>
            <strong>Customs &amp; Duties:</strong> Orders shipped outside the Philippines may be subject to local import duties, taxes, and handling fees levied by the destination country&rsquo;s customs authority. These charges are the responsibility of the recipient.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            3. Order Dispatch &amp; Tracking
          </h2>
          <p>
            Orders placed on Monday through Friday before 12:00 PM PHT are processed the same business day. Orders placed over weekends or Philippine national holidays are processed on the next business day.
          </p>
          <p>
            As soon as your parcel is scanned by the courier, you will receive an email containing your tracking number and direct courier tracking URL. You can also view real-time tracking in your{" "}
            <Link to="/account/orders" className="text-ink underline">
              Account Order Dashboard
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-serif text-ink font-normal uppercase tracking-wider">
            4. Signature on Delivery &amp; Packaging
          </h2>
          <p>
            To safeguard high-value wardrobe items, parcels require a physical signature or authorized recipient upon delivery. Each garment is packed in our breathable atelier garment bags and recycled cardboard boxes to ensure pristine arrival.
          </p>
        </section>

        <section className="pt-6 border-t border-stone-200">
          <p className="text-stone-500 text-xs">
            Have questions regarding an active shipment? Contact our concierge at{" "}
            <a href="mailto:logistics@studio-atelier.ph" className="text-ink underline">
              logistics@studio-atelier.ph
            </a>{" "}
            or via our{" "}
            <Link to="/contact" className="text-ink underline">
              Customer Care Concierge
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
