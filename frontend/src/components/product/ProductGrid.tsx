import { useMemo } from "react";
import type { Category, Color, ProductSummary, Size } from "@/types/api";
import { cn } from "@/lib/utils";
import { ProductCard, ProductGridSkeleton } from "./ProductCard";
import { EmptyState } from "@/components/ui/misc";

export type SortOption = "featured" | "newest" | "price-asc" | "price-desc" | "bestselling";

export const SORT_LABELS: Record<SortOption, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  bestselling: "Best Selling",
};

export interface PriceRange {
  label: string;
  min?: number;
  max?: number;
}

export const PRICE_RANGES: PriceRange[] = [
  { label: "All Prices" },
  { label: "Under ₱100", max: 100 },
  { label: "₱100 – ₱250", min: 100, max: 250 },
  { label: "₱250 – ₱500", min: 250, max: 500 },
  { label: "Over ₱500", min: 500 },
];

export function SortSelect({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10.5px] uppercase tracking-widest text-stone-400 font-mono hidden sm:inline">
        Sort:
      </span>
      <select
        aria-label="Sort products"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="border-0 bg-transparent pr-4 text-[11px] uppercase tracking-widest text-ink font-medium focus:outline-none cursor-pointer"
      >
        {(Object.keys(SORT_LABELS) as SortOption[]).map((k) => (
          <option key={k} value={k}>
            {SORT_LABELS[k]}
          </option>
        ))}
      </select>
    </div>
  );
}

export interface Filters {
  colorIds: number[];
  sizeIds: number[];
  priceMin?: number;
  priceMax?: number;
  inStockOnly?: boolean;
  newOnly?: boolean;
  category?: string;
}

export function ProductFilters({
  colors,
  sizes,
  categories = [],
  value,
  onChange,
  resultCount,
  onReset,
}: {
  colors: Color[];
  sizes: Size[];
  categories?: Category[];
  value: Filters;
  onChange: (f: Filters) => void;
  resultCount: number | null;
  onReset?: () => void;
}) {
  const toggleId = (list: number[], id: number) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const applyPrice = (range: PriceRange) => {
    onChange({ ...value, priceMin: range.min, priceMax: range.max });
  };

  const isCurrentPrice = (r: PriceRange) => {
    if (r.min === undefined && r.max === undefined) {
      return value.priceMin === undefined && value.priceMax === undefined;
    }
    return value.priceMin === r.min && value.priceMax === r.max;
  };

  const activeCount = useMemo(
    () =>
      value.colorIds.length +
      value.sizeIds.length +
      (value.priceMin !== undefined || value.priceMax !== undefined ? 1 : 0) +
      (value.inStockOnly ? 1 : 0) +
      (value.newOnly ? 1 : 0) +
      (value.category ? 1 : 0),
    [value]
  );

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      onChange({
        colorIds: [],
        sizeIds: [],
        priceMin: undefined,
        priceMax: undefined,
        inStockOnly: false,
        newOnly: false,
        category: undefined,
      });
    }
  };

  return (
    <aside className="space-y-7 bg-paper p-5 border border-stone-200/80">
      <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
        <h2 className="text-[11px] uppercase tracking-widest text-ink font-medium">Refine Selection</h2>
        {activeCount > 0 && (
          <button
            type="button"
            className="text-[10.5px] uppercase tracking-widest text-stone-500 hover:text-ink underline underline-offset-2"
            onClick={handleReset}
          >
            Reset ({activeCount})
          </button>
        )}
      </div>

      {resultCount !== null && (
        <p className="text-[11px] text-stone-400 font-mono">
          {resultCount} {resultCount === 1 ? "piece" : "pieces"} available
        </p>
      )}

      {/* Availability / In-Stock filter */}
      <section className="space-y-2.5">
        <h3 className="text-[10.5px] font-medium uppercase tracking-widest text-stone-600">
          Availability
        </h3>
        <label className="flex items-center gap-2.5 cursor-pointer text-xs text-ink hover:text-stone-600 transition-colors">
          <input
            type="checkbox"
            checked={Boolean(value.inStockOnly)}
            onChange={(e) => onChange({ ...value, inStockOnly: e.target.checked })}
            className="rounded-none border-stone-300 text-ink focus:ring-0 cursor-pointer size-3.5"
          />
          <span className="text-[11.5px] uppercase tracking-wider">In Stock Only</span>
        </label>
      </section>

      {/* New Arrivals filter */}
      <section className="space-y-2.5">
        <h3 className="text-[10.5px] font-medium uppercase tracking-widest text-stone-600">
          Collections
        </h3>
        <label className="flex items-center gap-2.5 cursor-pointer text-xs text-ink hover:text-stone-600 transition-colors">
          <input
            type="checkbox"
            checked={Boolean(value.newOnly)}
            onChange={(e) => onChange({ ...value, newOnly: e.target.checked })}
            className="rounded-none border-stone-300 text-ink focus:ring-0 cursor-pointer size-3.5"
          />
          <span className="text-[11.5px] uppercase tracking-wider">New Arrivals</span>
        </label>
      </section>

      {/* Categories (when present) */}
      {categories.length > 0 && (
        <section>
          <h3 className="mb-2.5 text-[10.5px] font-medium uppercase tracking-widest text-stone-600">
            Category
          </h3>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onChange({ ...value, category: undefined })}
              className={cn(
                "block w-full text-left text-xs transition-colors py-1",
                !value.category
                  ? "text-ink font-medium underline underline-offset-4"
                  : "text-stone-500 hover:text-ink"
              )}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onChange({ ...value, category: c.slug })}
                className={cn(
                  "block w-full text-left text-xs transition-colors py-1",
                  value.category === c.slug
                    ? "text-ink font-medium underline underline-offset-4"
                    : "text-stone-500 hover:text-ink"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Color Filter */}
      {colors.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10.5px] font-medium uppercase tracking-widest text-stone-600">
              Color Palette
            </h3>
            {value.colorIds.length > 0 && (
              <span className="text-[10px] font-mono text-stone-400">
                {value.colorIds.length} selected
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const on = value.colorIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  title={c.name}
                  onClick={() => onChange({ ...value, colorIds: toggleId(value.colorIds, c.id) })}
                  className={cn(
                    "size-6 rounded-full border border-stone-300 transition-all duration-200 relative",
                    on && "ring-1 ring-ink ring-offset-2 ring-offset-paper scale-110"
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Size Filter */}
      {sizes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10.5px] font-medium uppercase tracking-widest text-stone-600">
              Garment Size
            </h3>
            {value.sizeIds.length > 0 && (
              <span className="text-[10px] font-mono text-stone-400">
                {value.sizeIds.length} selected
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5 font-mono">
            {sizes.map((s) => {
              const on = value.sizeIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange({ ...value, sizeIds: toggleId(value.sizeIds, s.id) })}
                  className={cn(
                    "border py-1.5 text-[10.5px] uppercase tracking-wider transition-all duration-200",
                    on
                      ? "border-ink bg-ink text-paper"
                      : "border-stone-200 text-stone-700 hover:border-stone-400 bg-paper"
                  )}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Price Filter */}
      <section>
        <h3 className="mb-3 text-[10.5px] font-medium uppercase tracking-widest text-stone-600">
          Price Bracket
        </h3>
        <div className="space-y-1.5">
          {PRICE_RANGES.map((r) => {
            const active = isCurrentPrice(r);
            return (
              <button
                key={r.label}
                type="button"
                onClick={() => applyPrice(r)}
                className={cn(
                  "block w-full text-left text-xs transition-colors py-1",
                  active
                    ? "text-ink font-medium underline underline-offset-4"
                    : "text-stone-500 hover:text-ink"
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </section>
    </aside>
  );
}

export function ProductGrid({
  products,
  loading,
  emptyTitle = "No pieces match those filters",
  emptyBody = "Try resetting the color palette or widening the price range to explore the full collection.",
  onResetFilters,
}: {
  products: ProductSummary[];
  loading?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  onResetFilters?: () => void;
}) {
  if (loading) return <ProductGridSkeleton />;
  if (!products.length) {
    return (
      <EmptyState
        title={emptyTitle}
        body={emptyBody}
        action={
          onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="border border-ink bg-ink px-4 py-2 text-xs uppercase tracking-widest text-paper hover:bg-stone-800 transition-colors"
            >
              Reset Filters
            </button>
          )
        }
      />
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 min-h-[400px]">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
