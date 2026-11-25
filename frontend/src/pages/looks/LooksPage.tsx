import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Sparkles, Package } from "lucide-react";
import { ErrorState } from "@/components/ui/StateViews";
import { getLooks } from "@/api/looks";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export function LooksPage() {
  const [activeTab, setActiveTab] = useState<"all" | "featured">("all");
  const { data: looks = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["looks", activeTab],
    queryFn: () => getLooks(activeTab === "featured"),
  });

  const featuredHero = looks.find((l) => l.is_featured) || looks[0];
  const gridLooks = activeTab === "all" ? looks : looks.filter((l) => l.is_featured);

  return (
    <div className="container-editorial py-10 md:py-16">
      {/* Editorial Header */}
      <div className="mb-12 border-b border-stone-200/80 pb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-stone-400 font-medium mb-2">
              <Sparkles size={12} className="text-ink" />
              <span>Editorial Styling</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-serif text-ink tracking-tight font-normal">
              Shop the Look
            </h1>
            <p className="mt-3 text-xs md:text-sm text-stone-500 max-w-xl leading-relaxed">
              Curated silhouettes and coordinated wardrobe combinations crafted by our studio atelier. Discover how individual garments interact and purchase matching sets with exclusive bundle savings.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border border-stone-200/90 p-1 bg-stone-50 rounded-sm self-start md:self-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "px-4 py-1.5 text-[11px] uppercase tracking-widest transition-all",
                activeTab === "all"
                  ? "bg-ink text-white font-medium"
                  : "text-stone-500 hover:text-ink"
              )}
            >
              All Outfits ({looks.length})
            </button>
            <button
              onClick={() => setActiveTab("featured")}
              className={cn(
                "px-4 py-1.5 text-[11px] uppercase tracking-widest transition-all",
                activeTab === "featured"
                  ? "bg-ink text-white font-medium"
                  : "text-stone-500 hover:text-ink"
              )}
            >
              Featured Edits
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-pulse">
          <div className="md:col-span-3 h-96 bg-stone-100 rounded-sm" />
          <div className="h-80 bg-stone-100 rounded-sm" />
          <div className="h-80 bg-stone-100 rounded-sm" />
          <div className="h-80 bg-stone-100 rounded-sm" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Curated looks unavailable"
          message="Unable to load styled looks at this moment. Please check your network connection and try again."
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      ) : looks.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <Package size={24} className="mx-auto text-stone-300" />
          <p className="text-xs uppercase tracking-widest text-stone-400">No outfits currently available.</p>
        </div>
      ) : (
        <div className="space-y-16">
          {/* Featured Hero Outfit Spotlight (when available in All tab) */}
          {featuredHero && activeTab === "all" && (
            <div className="group relative border border-stone-200/90 bg-stone-50/40 overflow-hidden rounded-sm transition-all hover:border-stone-300">
              <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                <div className="lg:col-span-7 relative overflow-hidden aspect-[4/3] lg:aspect-auto min-h-[380px]">
                  <img
                    src={featuredHero.hero_image || featuredHero.cover_image}
                    alt={featuredHero.cover_image_alt || featuredHero.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    loading="eager"
                  />
                  <div className="absolute top-4 left-4 bg-ink/90 text-white text-[9px] uppercase tracking-[0.25em] px-3 py-1 font-medium backdrop-blur-sm">
                    Featured Look
                  </div>
                </div>

                <div className="lg:col-span-5 p-8 lg:p-12 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] uppercase tracking-widest text-stone-400">
                        {featuredHero.items_count} Styled Pieces
                      </span>
                      {featuredHero.bundle_pricing?.is_eligible && (
                        <span className="text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 border border-emerald-200/80 font-medium">
                          {featuredHero.bundle_pricing.savings_label}
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl md:text-3xl font-serif text-ink tracking-tight font-normal">
                      {featuredHero.name}
                    </h2>

                    <p className="text-xs md:text-sm text-stone-600 leading-relaxed">
                      {featuredHero.description}
                    </p>

                    {/* Styled Pieces List */}
                    <div className="pt-2">
                      <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-2 font-medium">
                        Pieces in this look:
                      </p>
                      <ul className="space-y-1.5 text-xs text-stone-700">
                        {featuredHero.items.map((it) => (
                          <li key={it.id} className="flex items-center justify-between border-b border-stone-200/60 pb-1.5">
                            <span className="font-medium text-stone-800">{it.product_name}</span>
                            <span className="text-stone-500 font-mono text-[11px]">{formatMoney(it.price)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-stone-200/80 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-stone-400">Complete Set</div>
                      <div className="flex items-baseline gap-2">
                        {featuredHero.bundle_pricing?.is_eligible ? (
                          <>
                            <span className="text-base font-semibold text-ink font-mono">
                              {formatMoney(featuredHero.bundle_pricing.final_total)}
                            </span>
                            <span className="text-xs line-through text-stone-400 font-mono">
                              {formatMoney(featuredHero.bundle_pricing.subtotal)}
                            </span>
                          </>
                        ) : (
                          <span className="text-base font-semibold text-ink font-mono">
                            {formatMoney(featuredHero.total_price)}
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      to={`/looks/${featuredHero.slug}`}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-ink text-white text-xs uppercase tracking-widest hover:bg-stone-800 transition-colors"
                    >
                      <span>Explore Look</span>
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grid of All Looks */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-widest text-stone-500 font-medium">
                {activeTab === "all" ? "All Curated Outfits" : "Featured Edits"} ({gridLooks.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {gridLooks.map((look) => (
                <Link
                  key={look.id}
                  to={`/looks/${look.slug}`}
                  className="group flex flex-col border border-stone-200/80 bg-white hover:border-stone-400 transition-all duration-300"
                >
                  {/* Photo container with 4/5 aspect ratio */}
                  <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
                    <img
                      src={look.cover_image}
                      alt={look.cover_image_alt || look.name}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      loading="lazy"
                    />
                    {look.is_featured && (
                      <span className="absolute top-3 left-3 bg-white/95 text-ink text-[9px] uppercase tracking-widest px-2.5 py-0.5 border border-stone-200 font-medium">
                        Featured
                      </span>
                    )}
                    {look.bundle_pricing?.is_eligible && (
                      <span className="absolute top-3 right-3 bg-emerald-900/90 text-white text-[9px] uppercase tracking-wider px-2 py-0.5 font-medium">
                        {look.bundle_pricing.savings_label}
                      </span>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-stone-400 mb-1">
                        <span>{look.items_count} Coordinated Pieces</span>
                      </div>
                      <h4 className="text-lg font-serif text-ink tracking-tight font-normal group-hover:text-stone-600 transition-colors">
                        {look.name}
                      </h4>
                      <p className="mt-1 text-xs text-stone-500 line-clamp-2 leading-relaxed">
                        {look.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                      <div>
                        <div className="text-[9px] uppercase tracking-widest text-stone-400">Complete Look</div>
                        <div className="flex items-baseline gap-2">
                          {look.bundle_pricing?.is_eligible ? (
                            <>
                              <span className="text-sm font-semibold text-ink font-mono">
                                {formatMoney(look.bundle_pricing.final_total)}
                              </span>
                              <span className="text-[11px] line-through text-stone-400 font-mono">
                                {formatMoney(look.bundle_pricing.subtotal)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-semibold text-ink font-mono">
                              {formatMoney(look.total_price)}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-xs uppercase tracking-widest font-medium text-ink inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>View</span>
                        <ArrowUpRight size={13} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
