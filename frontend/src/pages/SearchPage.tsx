import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getColors, getSizes, getCategories, getProducts } from "@/api/products";
import {
  ProductGrid,
  ProductFilters,
  SortSelect,
  type Filters,
} from "@/components/product/ProductGrid";
import { ActiveFiltersBar } from "@/components/product/ActiveFiltersBar";
import { Drawer } from "@/components/ui/Drawer";
import { ErrorState } from "@/components/ui/StateViews";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useProductFilterParams, type FilterState } from "@/hooks/useProductFilterParams";

const SUGGESTED_SEARCHES = [
  "Linen",
  "Silk Slip",
  "Tailored Blazer",
  "Merino Knit",
  "Overcoat",
  "Trousers",
  "Poplin",
];

const SUGGESTED_CATEGORIES = [
  { label: "Women's Collection", href: "/women" },
  { label: "Men's Collection", href: "/men" },
  { label: "Dresses & Slips", href: "/category/women-dresses" },
  { label: "Coats & Outerwear", href: "/category/women-outerwear" },
  { label: "Seasonal Looks", href: "/looks" },
];

export function SearchPage() {
  const { filters, updateFilters, resetAllFilters } = useProductFilterParams("newest");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Local input state for smooth typing, debounced into URL query
  const [input, setInput] = useState(filters.q ?? "");
  const debouncedQuery = useDebouncedValue(input, 300);

  // Sync debounced input with URL params
  useEffect(() => {
    if (debouncedQuery !== (filters.q ?? "")) {
      updateFilters({ q: debouncedQuery.trim() || undefined });
    }
  }, [debouncedQuery, filters.q, updateFilters]);

  // Keep local input in sync when URL changes from browser back/forward or navigation
  useEffect(() => {
    if (filters.q !== undefined && filters.q !== input) {
      setInput(filters.q);
    }
  }, [filters.q, input]);

  const { data: colors } = useQuery({ queryKey: ["lookups", "colors"], queryFn: getColors });
  const { data: sizes } = useQuery({ queryKey: ["lookups", "sizes"], queryFn: getSizes });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  const activeSearchTerm = filters.q ?? debouncedQuery.trim();

  const queryParams = useMemo(() => {
    return {
      q: activeSearchTerm || undefined,
      category: filters.category,
      sort: filters.sort,
      color: filters.colorIds.length ? filters.colorIds.join(",") : undefined,
      size: filters.sizeIds.length ? filters.sizeIds.join(",") : undefined,
      min_price: filters.priceMin,
      max_price: filters.priceMax,
      in_stock: filters.inStockOnly ? "true" : undefined,
      new: filters.newOnly ? "true" : undefined,
    };
  }, [activeSearchTerm, filters]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["products", queryParams],
    queryFn: () => getProducts(queryParams),
    enabled: activeSearchTerm.length > 0,
    placeholderData: (prev) => prev,
  });

  const filterValues: Filters = useMemo(
    () => ({
      colorIds: filters.colorIds,
      sizeIds: filters.sizeIds,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      inStockOnly: filters.inStockOnly,
      newOnly: filters.newOnly,
      category: filters.category,
    }),
    [filters]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.colorIds.length > 0) count += filters.colorIds.length;
    if (filters.sizeIds.length > 0) count += filters.sizeIds.length;
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) count += 1;
    if (filters.inStockOnly) count += 1;
    if (filters.newOnly) count += 1;
    if (filters.category) count += 1;
    return count;
  }, [filters]);

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
      setInput("");
      updateFilters({ q: undefined });
    }
  };

  const handleClearInput = () => {
    setInput("");
    updateFilters({ q: undefined });
  };

  const handleSelectSuggestion = (term: string) => {
    setInput(term);
    updateFilters({ q: term });
  };

  return (
    <section className="container-editorial py-10 md:py-16 min-h-[70vh]">
      <header className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl">Catalogue Search</h1>
        <p className="mt-2 text-xs uppercase tracking-widest text-stone-500 font-mono">
          Explore tailored essentials, seasonal edits, and fine materials
        </p>

        {/* Search Bar Input */}
        <div className="relative mt-6 max-w-2xl">
          <div className="flex items-center border-b-2 border-stone-300 pb-2 transition-colors focus-within:border-ink">
            <Search size={22} className="text-stone-400 mr-3 shrink-0" />
            <input
              autoFocus
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search by garment, fabric, silhouette, or category…"
              className="w-full bg-transparent font-display text-2xl md:text-3xl placeholder:text-stone-300 focus:outline-none text-ink"
              aria-label="Search catalogue"
            />
            {isLoading && (
              <Loader2 size={20} className="animate-spin text-stone-400 shrink-0 ml-2" />
            )}
            {input && (
              <button
                type="button"
                onClick={handleClearInput}
                className="p-1 text-stone-400 hover:text-ink transition-colors ml-2 shrink-0"
                aria-label="Clear search input"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Suggested Terms when empty */}
      {activeSearchTerm === "" ? (
        <div className="mt-12 space-y-10 max-w-3xl">
          <div>
            <h2 className="text-[11px] uppercase tracking-widest text-stone-400 font-medium mb-3">
              Popular Searches
            </h2>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_SEARCHES.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => handleSelectSuggestion(term)}
                  className="border border-stone-200 bg-stone-50/70 px-4 py-1.5 text-xs uppercase tracking-wider text-stone-700 transition-colors hover:border-ink hover:bg-stone-100"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-[11px] uppercase tracking-widest text-stone-400 font-medium mb-3">
              Explore by Category
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SUGGESTED_CATEGORIES.map((cat) => (
                <Link
                  key={cat.href}
                  to={cat.href}
                  className="border border-stone-200/80 p-3.5 text-xs uppercase tracking-wider text-ink transition-colors hover:border-ink bg-paper"
                >
                  {cat.label} →
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Refine & Sort Toolbar */}
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

          {/* Mobile Filter Drawer */}
          <Drawer
            open={mobileFilterOpen}
            onClose={() => setMobileFilterOpen(false)}
            title="Refine Results"
            side="right"
            footer={
              <div className="flex items-center gap-3 w-full">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => resetAllFilters(["q", "sort"])}
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
                  Show {data?.count ?? 0} {data?.count === 1 ? "Result" : "Results"}
                </button>
              </div>
            }
          >
            <div className="py-2">
              <ProductFilters
                colors={colors ?? []}
                sizes={sizes ?? []}
                categories={categories ?? []}
                value={filterValues}
                onChange={handleFilterChange}
                resultCount={data?.count ?? null}
                onReset={() => resetAllFilters(["q", "sort"])}
              />
            </div>
          </Drawer>

          <div className="flex flex-col gap-10 md:flex-row">
            {/* Desktop Sidebar Filters */}
            <div className="hidden md:block md:w-56 md:shrink-0">
              <ProductFilters
                colors={colors ?? []}
                sizes={sizes ?? []}
                categories={categories ?? []}
                value={filterValues}
                onChange={handleFilterChange}
                resultCount={isLoading ? null : data?.count ?? null}
                onReset={() => resetAllFilters(["q", "sort"])}
              />
            </div>

            {/* Results Grid Area */}
            <div className="flex-1 min-w-0">
              {/* Active Filter Chips */}
              <ActiveFiltersBar
                filters={filters}
                colors={colors}
                sizes={sizes}
                categories={categories}
                onRemove={handleRemoveSingleFilter}
                onClearAll={() => resetAllFilters(["q", "sort"])}
                resultCount={data?.count}
              />

              {/* Desktop Toolbar: Result Count & Sort */}
              <div className="mb-6 hidden md:flex items-center justify-between border-b border-stone-200 pb-4">
                <p className="text-xs uppercase tracking-widest text-stone-500 font-mono">
                  {isLoading
                    ? "Searching catalogue…"
                    : `${data?.count ?? 0} ${data?.count === 1 ? "result" : "results"} for "${activeSearchTerm}"`}
                </p>
                <SortSelect value={filters.sort} onChange={(sort) => updateFilters({ sort })} />
              </div>

              {isError ? (
                <ErrorState
                  title="Search interrupted"
                  message={`Unable to retrieve search results for "${activeSearchTerm}". Please check your connection and retry.`}
                  onRetry={() => refetch()}
                  isRetrying={isFetching}
                />
              ) : (
                <ProductGrid
                  products={data?.results ?? []}
                  loading={isLoading}
                  emptyTitle={`No pieces found matching "${activeSearchTerm}"`}
                  emptyBody="Try broadening your filters, searching for a fabric like 'linen' or 'silk', or exploring our seasonal edits."
                  onResetFilters={activeFilterCount > 0 ? () => resetAllFilters(["q", "sort"]) : undefined}
                />
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
