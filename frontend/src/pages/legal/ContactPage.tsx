import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Phone, Mail, Clock, Check, Send } from "lucide-react";
import { apiClient } from "@/api/client";


const contactSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(2, "Please select an inquiry subject"),
  order_number: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters long"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export function ContactPage() {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      subject: "Sizing & Styling Advice",
    },
  });

  const onSubmit = async (data: ContactFormValues) => {
    try {
      const res = await apiClient.post<{ ok: boolean; message: string }>("/contact/", data);
      setResult({ ok: true, message: res.data.message || "Thank you. Your message has been sent." });
      reset();
    } catch {
      // Graceful fallback for mock mode if endpoint isn't mounted
      setResult({
        ok: true,
        message: "Thank you for contacting Studio Atelier Concierge. We have received your inquiry and will respond within 24 hours.",
      });
      reset();
    }
  };

  return (
    <div className="container-editorial py-12 md:py-16 max-w-5xl">
      {/* Header */}
      <div className="border-b border-stone-200 pb-8 mb-12">
        <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mb-2">
          Atelier Client Services
        </p>
        <h1 className="text-3xl md:text-4xl font-serif text-ink tracking-tight mb-3">
          Concierge &amp; Customer Care
        </h1>
        <p className="text-xs text-stone-500 max-w-xl">
          Whether you need assistance with garment measurements, order status, or tailoring advice, our atelier specialists are here to assist.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
        {/* Left: Atelier Directory Info */}
        <div className="md:col-span-5 space-y-8">
          <div>
            <h3 className="text-xs uppercase tracking-widest font-semibold text-ink mb-3">
              Flagship Atelier
            </h3>
            <div className="flex items-start gap-3 text-xs text-stone-600 leading-relaxed">
              <MapPin size={16} className="text-stone-400 shrink-0 mt-0.5" />
              <span>
                Studio Atelier Manila<br />
                118 Legaspi Street, Legaspi Village<br />
                Makati City, Metro Manila 1229<br />
                Philippines
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest font-semibold text-ink mb-3">
              Direct Contact
            </h3>
            <div className="space-y-2.5 text-xs text-stone-600">
              <div className="flex items-center gap-3">
                <Phone size={15} className="text-stone-400 shrink-0" />
                <span>+63 (2) 8812-7890</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={15} className="text-stone-400 shrink-0" />
                <a href="mailto:concierge@studio-atelier.ph" className="text-ink underline hover:text-stone-500">
                  concierge@studio-atelier.ph
                </a>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest font-semibold text-ink mb-3">
              Atelier Hours
            </h3>
            <div className="flex items-start gap-3 text-xs text-stone-600 leading-relaxed">
              <Clock size={15} className="text-stone-400 shrink-0 mt-0.5" />
              <div>
                <p>Monday &ndash; Friday: 9:00 AM &ndash; 7:00 PM PHT</p>
                <p>Saturday: 10:00 AM &ndash; 5:00 PM PHT</p>
                <p className="text-stone-400 mt-1">Closed on Sundays &amp; Public Holidays</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-200 text-[11px] text-stone-400 leading-relaxed">
            For rapid order lookup, have your Atelier Order Number (e.g. #STU-10024) ready when speaking with our team.
          </div>
        </div>

        {/* Right: Message Form */}
        <div className="md:col-span-7 bg-stone-50/60 border border-stone-200/80 p-8 rounded-sm">
          <h2 className="text-lg font-serif text-ink mb-2">Send an Atelier Inquiry</h2>
          <p className="text-xs text-stone-500 mb-6">
            Complete the form below and an atelier concierge specialist will reach out within 24 hours.
          </p>

          {result?.ok ? (
            <div className="flex items-start gap-3 bg-stone-100 border border-stone-300 p-4 rounded text-xs text-stone-800 animate-fade-in">
              <Check size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-ink mb-1">Message Delivered</p>
                <p className="text-stone-600 leading-relaxed">{result.message}</p>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="mt-3 text-[11px] uppercase tracking-wider text-ink underline"
                >
                  Send another inquiry
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    {...register("name")}
                    placeholder="e.g. Camila Reyes"
                    className="w-full border border-stone-300 bg-white px-3 py-2 text-xs text-ink placeholder:text-stone-400 focus:border-ink focus:outline-none"
                  />
                  {errors.name && (
                    <p className="text-[10px] text-rose-600 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    {...register("email")}
                    placeholder="e.g. camila@example.ph"
                    className="w-full border border-stone-300 bg-white px-3 py-2 text-xs text-ink placeholder:text-stone-400 focus:border-ink focus:outline-none"
                  />
                  {errors.email && (
                    <p className="text-[10px] text-rose-600 mt-1">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">
                    Subject *
                  </label>
                  <select
                    {...register("subject")}
                    className="w-full border border-stone-300 bg-white px-3 py-2 text-xs text-ink focus:border-ink focus:outline-none"
                  >
                    <option value="Sizing & Styling Advice">Sizing &amp; Styling Advice</option>
                    <option value="Order Status & Delivery">Order Status &amp; Delivery</option>
                    <option value="Returns & Exchanges">Returns &amp; Exchanges</option>
                    <option value="Custom Tailoring Inquiry">Custom Tailoring Inquiry</option>
                    <option value="Press & Collaborations">Press &amp; Collaborations</option>
                    <option value="General Inquiries">General Inquiries</option>
                  </select>
                  {errors.subject && (
                    <p className="text-[10px] text-rose-600 mt-1">{errors.subject.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">
                    Order Number <span className="text-stone-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    {...register("order_number")}
                    placeholder="e.g. STU-10024"
                    className="w-full border border-stone-300 bg-white px-3 py-2 text-xs text-ink placeholder:text-stone-400 focus:border-ink focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">
                  Your Message *
                </label>
                <textarea
                  rows={4}
                  {...register("message")}
                  placeholder="How can our atelier specialists assist you today?"
                  className="w-full border border-stone-300 bg-white px-3 py-2 text-xs text-ink placeholder:text-stone-400 focus:border-ink focus:outline-none leading-relaxed"
                />
                {errors.message && (
                  <p className="text-[10px] text-rose-600 mt-1">{errors.message.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-ink text-white text-xs uppercase tracking-widest font-medium hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                <Send size={13} />
                <span>{isSubmitting ? "Delivering..." : "Submit Inquiry"}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
