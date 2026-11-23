import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getColors, getSizes, getProducts, getCategories } from "@/api/products";
import {
  ProductGrid,
  ProductFilters,
  SortSelect,
  type Filters,
} from "@/components/product/ProductGrid";
import { ActiveFiltersBar } from "@/components/product/ActiveFiltersBar";
import { Drawer } from "@/components/ui/Drawer";
import { Skeleton } from "@/components/ui/misc";
import { useProductFilterParams, type FilterState } from "@/hooks/useProductFilterParams";

interface ProductListingProps {
  title: string;
  subtitle?: string;
  baseQuery?: Record<string, string>;
  showFilters?: boolean;
}

export function ProductListing({
  title,
  subtitle,
  baseQuery = {},
  showFilters = true,
}: ProductListingProps) {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const { filters, updateFilters, resetAllFilters } = useProductFilterParams("featured");

  const { data: colors } = useQuery({ queryKey: ["lookups", "colors"], queryFn: getColors });
  const { data: sizes } = useQuery({ queryKey: ["lookups", "sizes"], queryFn: getSizes });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  // Effective category is baseQuery.category if fixed, else user-selected category
  const effectiveCategory = baseQuery.category || filters.category;
  const isBaseNewArrivals = baseQuery.new === "true" || baseQuery.new === "1";

  const queryParams = useMemo(() => {
    return {
      ...baseQuery,
      category: effectiveCategory,
      sort: filters.sort,
      color: filters.colorIds.length ? filters.colorIds.join(",") : undefined,
      size: filters.sizeIds.length ? filters.sizeIds.join(",") : undefined,
      min_price: filters.priceMin,
      max_price: filters.priceMax,
      in_stock: filters.inStockOnly ? "true" : undefined,
      new: isBaseNewArrivals ? "true" : filters.newOnly ? "true" : undefined,
    };
  }, [baseQuery, effectiveCategory, filters, isBaseNewArrivals]);

  const queryKey = useMemo(() => ["products", queryParams], [queryParams]);

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => getProducts(queryParams),
    placeholderData: (prev) => prev,
  });

  const filterValues: Filters = useMemo(
    () => ({
      colorIds: filters.colorIds,
      sizeIds: filters.sizeIds,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      inStockOnly: filters.inStockOnly,
      newOnly: isBaseNewArrivals ? undefined : filters.newOnly,
      category: baseQuery.category ? undefined : filters.category,
    }),
    [filters, isBaseNewArrivals, baseQuery.category]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.colorIds.length > 0) count += filters.colorIds.length;
    if (filters.sizeIds.length > 0) count += filters.sizeIds.length;
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) count += 1;
    if (filters.inStockOnly) count += 1;
    if (!isBaseNewArrivals && filters.newOnly) count += 1;
    if (!baseQuery.category && filters.category) count += 1;
    return count;
  }, [filters, isBaseNewArrivals, baseQuery.category]);

  const handleFilterChange = (f: Filters) => {
    updateFilters({
      colorIds: f.colorIds,
      sizeIds: f.sizeIds,
      priceMin: f.priceMin,
      priceMax: f.priceMax,
      inStockOnly: f.inStockOnly ?? false,
      newOnly: f.newOnly ?? false,
      category: f.category,
    });
  };

  const handleRemoveSingleFilter = (key: keyof FilterState, value?: any) => {
    if (key === "colorIds" && value !== undefined) {
      updateFilters({ colorIds: filters.colorIds.filter((id) => id !== value) });
    } else if (key === "sizeIds" && value !== undefined) {
      updateFilters({ sizeIds: filters.sizeIds.filter((id) => id !== value) });
    } else if (key === "priceMin" || key === "priceMax") {
      updateFilters({ priceMin: undefined, priceMax: undefined });
    } else if (key === "inStockOnly") {
      updateFilters({ inStockOnly: false });
    } else if (key === "newOnly") {
      updateFilters({ newOnly: false });
    } else if (key === "category") {
      updateFilters({ category: undefined });
    } else if (key === "q") {
      updateFilters({ q: undefined });
    }
  };

  return (
    <section className="container-editorial py-10 md:py-16">
      <header className="mb-8 md:mb-10">
        <h1 className="font-display text-4xl md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-lg text-sm text-stone-500 leading-relaxed">{subtitle}</p>}
      </header>

      {/* Mobile Refine & Sort Toolbar */}
      {showFilters && (
        <div className="md:hidden flex items-center justify-between border-y border-stone-200/80 bg-paper py-3 mb-6">
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="inline-flex items-center gap-2 border border-stone-300 bg-stone-50/80 px-3.5 py-1.5 text-xs uppercase tracking-widest text-ink transition-colors hover:border-ink hover:bg-stone-100"
          >
            <SlidersHorizontal size={13} />
            <span>Refine</span>
            {activeFilterCount > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-ink text-[9px] font-mono font-medium text-paper">
                {activeFilterCount}
              </span>
            )}
          </button>

          <SortSelect value={filters.sort} onChange={(sort) => updateFilters({ sort })} />
        </div>
      )}

      {/* Mobile Filter Drawer */}
      <Drawer
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        title="Refine Selection"
        side="right"
        footer={
          <div className="flex items-center gap-3 w-full">
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  resetAllFilters(["sort"]);
                }}
                className="w-1/3 border border-stone-300 py-3 text-xs uppercase tracking-widest text-stone-600 hover:text-ink transition-colors"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(false)}
              className="flex-1 border border-ink bg-ink py-3 text-xs uppercase tracking-widest text-paper hover:bg-stone-800 transition-colors"
            >
              Show {data?.count ?? 0} {data?.count === 1 ? "Piece" : "Pieces"}
            </button>
          </div>
        }
      >
        <div className="py-2">
          <ProductFilters
            colors={colors ?? []}
            sizes={sizes ?? []}
            categories={baseQuery.category ? undefined : categories ?? []}
            value={filterValues}
            onChange={handleFilterChange}
            resultCount={data?.count ?? null}
            onReset={() => resetAllFilters(["sort"])}
          />
        </div>
      </Drawer>

      <div className="flex flex-col gap-10 md:flex-row">
        {/* Desktop Sidebar Filters */}
        {showFilters && (
          <div className="hidden md:block md:w-56 md:shrink-0">
            <ProductFilters
              colors={colors ?? []}
              sizes={sizes ?? []}
              categories={baseQuery.category ? undefined : categories ?? []}
              value={filterValues}
              onChange={handleFilterChange}
              resultCount={isLoading ? null : data?.count ?? null}
              onReset={() => resetAllFilters(["sort"])}
            />
          </div>
        )}

        {/* Main Products Area */}
        <div className="flex-1 min-w-0">
          {/* Active Filter Chips */}
          <ActiveFiltersBar
            filters={filters}
            colors={colors}
            sizes={sizes}
            categories={categories}
            onRemove={handleRemoveSingleFilter}
            onClearAll={() => resetAllFilters(["sort"])}
            resultCount={data?.count}
          />

          {/* Desktop Toolbar: Count & Sort */}
          <div className="mb-6 hidden md:flex items-center justify-between border-b border-stone-200 pb-4">
            {isLoading ? (
              <Skeleton className="h-4 w-28" />
            ) : (
              <p className="text-xs uppercase tracking-widest text-stone-400 font-mono">
                {data?.count ?? 0} {data?.count === 1 ? "piece" : "pieces"}
              </p>
            )}
            <SortSelect value={filters.sort} onChange={(sort) => updateFilters({ sort })} />
          </div>

          {isError ? (
            <div className="py-16 text-center">
              <p className="text-sm text-accent">Couldn't load products. Please try again.</p>
            </div>
          ) : (
            <ProductGrid
              products={data?.results ?? []}
              loading={isLoading}
              onResetFilters={activeFilterCount > 0 ? () => resetAllFilters(["sort"]) : undefined}
            />
          )}
        </div>
      </div>
    </section>
  );
}
