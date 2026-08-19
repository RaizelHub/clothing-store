import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCollections, getProducts } from "@/api/products";
import { ProductGrid } from "@/components/product/ProductGrid";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { placeholderImage } from "@/lib/format";

// Drop countdown helper (calculates time to simulated Drop 02)
function useDropCountdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 2, hours: 14, minutes: 28, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return timeLeft;
}

const CATEGORY_PORTALS = [
  {
    number: "01",
    title: "Women's Collection",
    subtitle: "Fluid silhouettes, 22-momme silk & textured knits",
    slug: "/women",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85",
  },
  {
    number: "02",
    title: "Men's Collection",
    subtitle: "Architectural tailoring, double-faced wool & raw cotton",
    slug: "/men",
    image: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=1000&q=85",
  },
  {
    number: "03",
    title: "Outerwear & Coats",
    subtitle: "Heavyweight wool, dropped shoulders & storm shields",
    slug: "/category/men-outerwear",
    image: "https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=1000&q=85",
  },
  {
    number: "04",
    title: "The Silk Edit",
    subtitle: "Bias-cut slips, column gowns & fluid separates",
    slug: "/category/women-dresses",
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=85",
  },
];

const LOOKBOOK_ITEMS = [
  {
    look: "LOOK 01",
    season: "AUTUMN / WINTER",
    title: "Double-Faced Cashmere Overcoat & Pure Merino Crew",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85",
    link: "/category/men-outerwear",
    pieces: ["Double-Faced Wool Coat", "17.5µ Merino Knit", "Pleated Wide Trouser"],
  },
  {
    look: "LOOK 02",
    season: "AUTUMN / WINTER",
    title: "22-Momme Bias-Cut Silk Slip & Sculpted Trench",
    image: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1200&q=85",
    link: "/category/women-dresses",
    pieces: ["Mulberry Silk Slip Gown", "Tailored Column Overcoat"],
  },
];

export function Home() {
  const countdown = useDropCountdown();

  const { data: newArrivals, isLoading: newLoading } = useQuery({
    queryKey: ["products", { sort: "newest", page: 1 }],
    queryFn: () => getProducts({ sort: "newest", page: 1 }),
  });
  const { data: featured } = useQuery({
    queryKey: ["products", { featured: true }],
    queryFn: () => getProducts({ featured: true }),
  });
  const { data: collections } = useQuery({
    queryKey: ["collections"],
    queryFn: getCollections,
  });
  const { data: recentlyViewed } = useRecentlyViewed();

  const newList = newArrivals?.results ?? [];
  const featuredList = featured?.results ?? [];

  return (
    <div className="space-y-24 sm:space-y-32">
      {/* 1. HERO CAMPAIGN SECTION */}
      <section className="relative flex min-h-[88vh] sm:min-h-[92vh] items-end overflow-hidden bg-ink">
        <img
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2200&q=88"
          alt="Studio Atelier Autumn Capsule"
          className="absolute inset-0 size-full object-cover opacity-80 scale-100 transition-transform duration-1000 ease-editorial"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        <div className="container-editorial relative z-10 pb-16 sm:pb-24">
          <div className="inline-flex items-center gap-2 border-b border-paper/40 pb-1 text-[10.5px] uppercase tracking-widest text-paper/90">
            <span>Capsule 01 · Limited Production</span>
          </div>

          <h1 className="mt-6 max-w-4xl font-display text-4xl leading-[1.05] text-paper sm:text-6xl md:text-7xl lg:text-8xl">
            Considered fabrics. Quiet precision.
          </h1>

          <p className="mt-6 max-w-xl text-xs leading-relaxed text-paper/80 sm:text-sm md:text-base">
            Ten foundational pieces crafted from Normandy washed linen, 17.5µ merino wool, and 22-momme Mulberry silk. Designed to layer for decades.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/new"
              className="group inline-flex items-center gap-3 bg-paper px-8 py-4 text-xs font-medium uppercase tracking-widest text-ink transition-all duration-300 ease-editorial hover:bg-stone-200"
            >
              Explore Capsule 01
              <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              to="/collections"
              className="inline-flex items-center gap-2 border border-paper/40 bg-ink/20 px-8 py-4 text-xs uppercase tracking-widest text-paper backdrop-blur-sm transition-all duration-300 hover:border-paper hover:bg-paper/10"
            >
              View Lookbook
            </Link>
          </div>
        </div>
      </section>

      {/* 2. CAPSULE DROP TEASER & COUNTDOWN */}
      <section className="container-editorial">
        <div className="border border-stone-200/90 bg-stone-100/50 p-8 sm:p-12 lg:p-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-stone-500 font-mono">
              <Clock size={13} strokeWidth={1.5} />
              <span>Next Release · Atelier Drop 02</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl text-ink">
              The Winter Tailoring Capsule
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Eight structured coats and brushed alpaca sweaters crafted in northern Italy. Limited to 150 individually numbered pieces.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex items-center gap-3 sm:gap-4 font-mono">
              <div className="flex flex-col items-center bg-paper border border-stone-200/80 px-3.5 py-2.5 min-w-14">
                <span className="text-xl sm:text-2xl font-normal text-ink">
                  {String(countdown.days).padStart(2, "0")}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-stone-400">Days</span>
              </div>
              <span className="text-stone-400">:</span>
              <div className="flex flex-col items-center bg-paper border border-stone-200/80 px-3.5 py-2.5 min-w-14">
                <span className="text-xl sm:text-2xl font-normal text-ink">
                  {String(countdown.hours).padStart(2, "0")}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-stone-400">Hours</span>
              </div>
              <span className="text-stone-400">:</span>
              <div className="flex flex-col items-center bg-paper border border-stone-200/80 px-3.5 py-2.5 min-w-14">
                <span className="text-xl sm:text-2xl font-normal text-ink">
                  {String(countdown.minutes).padStart(2, "0")}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-stone-400">Mins</span>
              </div>
              <span className="text-stone-400">:</span>
              <div className="flex flex-col items-center bg-paper border border-stone-200/80 px-3.5 py-2.5 min-w-14">
                <span className="text-xl sm:text-2xl font-normal text-ink">
                  {String(countdown.seconds).padStart(2, "0")}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-stone-400">Secs</span>
              </div>
            </div>

            <Link
              to="/collections"
              className="inline-flex items-center gap-2 border border-ink bg-ink px-6 py-3.5 text-xs font-medium uppercase tracking-widest text-paper transition-colors hover:bg-stone-800"
            >
              Preview Drop <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. NEW ARRIVALS CURATED GRID */}
      <section className="container-editorial">
        <div className="mb-10 flex items-end justify-between border-b border-stone-200 pb-5">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-stone-500 font-medium">
              Autumn Capsule 01
            </p>
            <h2 className="mt-1 font-display text-3xl sm:text-4xl text-ink">New arrivals</h2>
          </div>
          <Link
            to="/new"
            className="group flex items-center gap-2 text-xs uppercase tracking-widest text-ink transition-colors hover:text-stone-600"
          >
            View all ({newList.length})
            <ArrowRight size={14} strokeWidth={1.5} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
        <ProductGrid products={newList.slice(0, 8)} loading={newLoading} />
      </section>

      {/* 4. EDITORIAL LOOKBOOK & SHOP THE LOOK */}
      <section className="container-editorial">
        <div className="mb-10 border-b border-stone-200 pb-5 flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-stone-500 font-medium">
              Editorial Portfolio
            </p>
            <h2 className="mt-1 font-display text-3xl sm:text-4xl text-ink">Shop the Look</h2>
          </div>
          <Link
            to="/collections"
            className="text-xs uppercase tracking-widest text-stone-500 hover:text-ink transition-colors"
          >
            View Full Series →
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {LOOKBOOK_ITEMS.map((look) => (
            <div key={look.look} className="group flex flex-col border border-stone-200/80 bg-paper">
              <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
                <img
                  src={look.image}
                  alt={look.title}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.02]"
                />
                <div className="absolute left-4 top-4 bg-ink/85 px-3 py-1 text-[10px] uppercase tracking-widest text-paper backdrop-blur-sm">
                  {look.look} · {look.season}
                </div>
              </div>

              <div className="p-6 sm:p-8 flex flex-col justify-between flex-1 space-y-6">
                <div>
                  <h3 className="font-display text-2xl text-ink leading-snug">{look.title}</h3>
                  <div className="mt-4 space-y-1.5">
                    {look.pieces.map((piece, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-stone-600">
                        <span className="text-[10px] font-mono text-stone-400">0{i + 1}</span>
                        <span>{piece}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                  <Link
                    to={look.link}
                    className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-ink hover:underline underline-offset-4"
                  >
                    Inspect Ensemble <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CATEGORY PORTALS */}
      <section className="container-editorial">
        <div className="mb-10 border-b border-stone-200 pb-5">
          <p className="text-[11px] uppercase tracking-widest text-stone-500 font-medium">
            Atelier Directory
          </p>
          <h2 className="mt-1 font-display text-3xl sm:text-4xl text-ink">Shop by category</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_PORTALS.map((cat) => (
            <Link
              key={cat.slug}
              to={cat.slug}
              className="group relative flex flex-col overflow-hidden border border-stone-200/80 bg-paper"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
                <img
                  src={cat.image}
                  alt={cat.title}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-ink/10 group-hover:bg-transparent transition-colors" />
                <span className="absolute left-4 top-4 font-mono text-xs text-paper bg-ink/70 px-2 py-0.5 backdrop-blur-sm">
                  {cat.number}
                </span>
              </div>
              <div className="p-5 flex flex-col justify-between flex-1 bg-paper">
                <div>
                  <h3 className="font-display text-xl text-ink">{cat.title}</h3>
                  <p className="mt-1 text-xs text-stone-500 leading-relaxed line-clamp-2">
                    {cat.subtitle}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink font-medium">
                  <span>Explore</span>
                  <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 6. CRAFTSMANSHIP & ATELIER PHILOSOPHY */}
      <section className="container-editorial">
        <div className="border-y border-stone-200 py-16 sm:py-24 grid gap-12 lg:grid-cols-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <span className="text-[11px] uppercase tracking-widest text-stone-500 font-medium">
              Material Ethics & Sourcing
            </span>
            <h2 className="font-display text-3xl sm:text-5xl leading-tight text-ink">
              Crafted for decades, not seasons.
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              We partner exclusively with family-owned mills in Biella, Como, and Normandy. Every garment is constructed with French seams, horn buttons, and high-density thread to ensure enduring resilience.
            </p>
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-stone-200 text-xs">
              <div>
                <span className="font-mono text-stone-400 block text-[10px] uppercase">Noble Sourcing</span>
                <span className="font-medium text-ink mt-1 block">100% Traceable Fibers</span>
              </div>
              <div>
                <span className="font-mono text-stone-400 block text-[10px] uppercase">Enduring Care</span>
                <span className="font-medium text-ink mt-1 block">Lifetime Repair Service</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 gap-4">
            <img
              src="https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=800&q=80"
              alt="Fabric tailoring detail"
              className="aspect-[4/5] object-cover border border-stone-200/80"
            />
            <img
              src="https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80"
              alt="Silk drape detail"
              className="aspect-[4/5] object-cover border border-stone-200/80 mt-8"
            />
          </div>
        </div>
      </section>

      {/* 7. CORE EDIT (FEATURED ESSENTIALS) */}
      <section className="container-editorial">
        <div className="mb-10 flex items-end justify-between border-b border-stone-200 pb-5">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-stone-500 font-medium">
              Signature Silhouettes
            </p>
            <h2 className="mt-1 font-display text-3xl sm:text-4xl text-ink">The core edit</h2>
          </div>
          <Link
            to="/collections"
            className="text-xs uppercase tracking-widest text-stone-500 hover:text-ink transition-colors"
          >
            All Pieces →
          </Link>
        </div>
        <ProductGrid products={featuredList.slice(0, 8)} loading={featuredList.length === 0} />
      </section>

      {/* 8. CURATED CAPSULES */}
      {collections && collections.length > 0 && (
        <section className="container-editorial">
          <div className="mb-10 flex items-end justify-between border-b border-stone-200 pb-5">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-stone-500 font-medium">
                Seasonal Volumes
              </p>
              <h2 className="mt-1 font-display text-3xl sm:text-4xl text-ink">Curated collections</h2>
            </div>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => (
              <Link
                key={c.id}
                to={`/collections/${c.slug}`}
                className="group block bg-paper border border-stone-200/80 transition-all duration-300 hover:border-stone-400"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                  <img
                    src={c.hero_image ?? placeholderImage(c.slug, "#c7bda9", 0)}
                    alt={c.name}
                    className="size-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-xl text-ink">{c.name}</span>
                    <span className="text-[10px] uppercase tracking-widest text-stone-400 font-mono">
                      {c.product_count ?? c.product_ids.length} pieces
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-stone-500 line-clamp-2 leading-relaxed">
                    {c.tagline}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 9. RECENTLY VIEWED */}
      {recentlyViewed && recentlyViewed.length > 0 && (
        <section className="container-editorial border-t border-stone-200 pt-16">
          <div className="mb-8">
            <h2 className="font-display text-2xl text-ink">Recently viewed</h2>
          </div>
          <ProductGrid products={recentlyViewed} />
        </section>
      )}
    </div>
  );
}