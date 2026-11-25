import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { getCollection, getCollections } from "@/api/products";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ErrorState } from "@/components/ui/StateViews";
import { placeholderImage } from "@/lib/format";

export function Collections() {
  const { data: collections, isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ["collections"], queryFn: getCollections });

  return (
    <section className="container-editorial py-12 sm:py-16">
      <header className="mb-12 max-w-2xl border-b border-stone-200 pb-6">
        <p className="text-[11px] uppercase tracking-widest text-stone-500 font-medium">
          Seasonal Releases
        </p>
        <h1 className="mt-1 font-display text-4xl sm:text-5xl text-ink">Curated Capsules</h1>
        <p className="mt-3 text-xs sm:text-sm text-stone-600 leading-relaxed">
          Thematic edits designed to cross categories — an architectural wool coat plus the fine silk slip that goes beneath it.
        </p>
      </header>

      {isError ? (
        <ErrorState
          title="Capsules unavailable"
          message="We could not load our seasonal capsules. Please check your network connection and try again."
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      ) : isLoading ? (
        <div className="grid gap-8 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="aspect-[16/10] animate-pulse bg-stone-200/80" />
          ))}
        </div>
      ) : (
        <div className="grid gap-10 md:grid-cols-2">
          {collections?.map((c) => (
            <Link
              key={c.id}
              to={`/collections/${c.slug}`}
              className="group flex flex-col bg-paper border border-stone-200/80 transition-all duration-300 hover:border-stone-400"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-stone-100">
                <img
                  src={c.hero_image ?? placeholderImage(c.slug, "#5f5c49", 0)}
                  alt={c.name}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.02]"
                />
                <div className="absolute left-4 top-4 bg-ink/80 px-2.5 py-1 text-[10px] uppercase tracking-widest text-paper backdrop-blur-sm font-mono">
                  {c.product_count ?? c.product_ids.length} pieces
                </div>
              </div>
              <div className="p-6 flex items-baseline justify-between">
                <div>
                  <h2 className="font-display text-2xl text-ink">{c.name}</h2>
                  <p className="mt-1.5 line-clamp-2 text-xs text-stone-500 leading-relaxed max-w-md">
                    {c.tagline}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-ink font-medium shrink-0 ml-4">
                  Explore <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function CollectionPage() {
  const { slug = "" } = useParams();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["collections", slug],
    queryFn: () => getCollection(slug),
    enabled: Boolean(slug),
  });

  if (isLoading) {
    return (
      <section className="container-editorial py-16">
        <div className="aspect-[21/9] animate-pulse bg-stone-200/80" />
        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] animate-pulse bg-stone-200/80" />
          ))}
        </div>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="container-editorial py-20">
        <ErrorState
          title="Collection unavailable"
          message="This capsule may have concluded its release run or an unexpected connection error occurred."
          onRetry={() => refetch()}
          isRetrying={isFetching}
          secondaryAction={{ label: "Return to all capsules", href: "/collections" }}
        />
      </section>
    );
  }

  return (
    <div>
      {/* Editorial Header */}
      <section className="relative flex min-h-[50vh] sm:min-h-[60vh] items-end overflow-hidden bg-ink">
        <img
          src={data.hero_image ?? placeholderImage(data.slug, "#5d2a30", 0)}
          alt={data.name}
          className="absolute inset-0 size-full object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        <div className="container-editorial relative z-10 pb-12 sm:pb-16 text-paper">
          <Link
            to="/collections"
            className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-widest text-paper/80 hover:text-paper mb-4"
          >
            <ArrowLeft size={12} /> All Capsules
          </Link>
          <h1 className="font-display text-4xl sm:text-6xl text-paper">{data.name}</h1>
          <p className="mt-3 text-xs sm:text-sm text-paper/80 max-w-xl leading-relaxed">
            {data.description || data.tagline}
          </p>
        </div>
      </section>

      {/* Collection Grid */}
      <section className="container-editorial pt-12 sm:pt-16">
        <div className="mb-8 border-b border-stone-200 pb-4 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-widest text-stone-500 font-mono">
            {data.products.length} {data.products.length === 1 ? "Piece" : "Pieces"} in this Capsule
          </p>
        </div>
        <ProductGrid products={data.products} />
      </section>
    </div>
  );
}