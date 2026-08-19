import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getColors, getSizes, getProducts } from "@/api/products";
import { ProductGrid, ProductFilters, SortSelect, type SortOption } from "@/components/product/ProductGrid";
import { Skeleton } from "@/components/ui/misc";

interface ProductListingProps {
  title: string;
  subtitle?: string;
  baseQuery?: Record<string, string>;
  showFilters?: boolean;
}

export function ProductListing({ title, subtitle, baseQuery = {}, showFilters = true }: ProductListingProps) {
  const [sort, setSort] = useState<SortOption>("featured");
  const [colorIds, setColorIds] = useState<number[]>([]);
  const [sizeIds, setSizeIds] = useState<number[]>([]);
  const [price, setPrice] = useState<{ min?: number; max?: number }>({});

  const { data: colors } = useQuery({ queryKey: ["lookups", "colors"], queryFn: getColors });
  const { data: sizes } = useQuery({ queryKey: ["lookups", "sizes"], queryFn: getSizes });

  const queryKey = useMemo(
    () => ["products", { ...baseQuery, sort, color: colorIds.join(","), size: sizeIds.join(","), price }],
    [baseQuery, sort, colorIds, sizeIds, price]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () =>
      getProducts({
        ...baseQuery,
        sort,
        color: colorIds.length ? colorIds.join(",") : undefined,
        size: sizeIds.length ? sizeIds.join(",") : undefined,
        min_price: price.min,
        max_price: price.max,
      }),
  });

  return (
    <section className="container-editorial py-12 md:py-16">
      <header className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-lg text-sm text-stone-500">{subtitle}</p>}
      </header>

      <div className="flex flex-col gap-10 md:flex-row">
        {showFilters && (
          <div className="md:w-56 md:shrink-0">
            <ProductFilters
              colors={colors ?? []}
              sizes={sizes ?? []}
              value={{ colorIds, sizeIds, priceMin: price.min, priceMax: price.max }}
              onChange={(f) => {
                setColorIds(f.colorIds);
                setSizeIds(f.sizeIds);
                setPrice({ min: f.priceMin, max: f.priceMax });
              }}
              resultCount={isLoading ? null : data?.count ?? null}
            />
          </div>
        )}

        <div className="flex-1">
          <div className="mb-6 flex items-center justify-between border-b border-stone-200 pb-4">
            {isLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <p className="text-xs uppercase tracking-widest text-stone-400">
                {data?.count ?? 0} {data?.count === 1 ? "item" : "items"}
              </p>
            )}
            <SortSelect value={sort} onChange={setSort} />
          </div>
          {isError ? (
            <p className="py-16 text-center text-sm text-accent">Couldn't load products. Please try again.</p>
          ) : (
            <ProductGrid products={data?.results ?? []} loading={isLoading} />
          )}
        </div>
      </div>
    </section>
  );
}