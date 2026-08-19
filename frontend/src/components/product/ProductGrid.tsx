import { useMemo, useState } from "react";
import type { ProductSummary } from "@/types/api";
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

interface PriceRange {
  label: string;
  min?: number;
  max?: number;
}

const PRICE_RANGES: PriceRange[] = [
  { label: "All Prices" },
  { label: "Under $100", max: 100 },
  { label: "$100 – $250", min: 100, max: 250 },
  { label: "$250 – $500", min: 250, max: 500 },
  { label: "Over $500", min: 500 },
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

interface Filters {
  colorIds: number[];
  sizeIds: number[];
  priceMin?: number;
  priceMax?: number;
}

export function ProductFilters({
  colors,
  sizes,
  value,
  onChange,
  resultCount,
}: {
  colors: { id: number; name: string; hex: string }[];
  sizes: { id: number; name: string }[];
  value: Filters;
  onChange: (f: Filters) => void;
  resultCount: number | null;
}) {
  const [priceRange, setPriceRange] = useState<PriceRange>(PRICE_RANGES[0]);

  const toggleId = (list: number[], id: number) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const applyPrice = (range: PriceRange) => {
    setPriceRange(range);
    onChange({ ...value, priceMin: range.min, priceMax: range.max });
  };

  const activeCount = useMemo(
    () => value.colorIds.length + value.sizeIds.length + (value.priceMin || value.priceMax ? 1 : 0),
    [value]
  );

  return (
    <aside className="space-y-8 bg-paper p-5 border border-stone-200/80">
      <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
        <h2 className="text-[11px] uppercase tracking-widest text-ink font-medium">Refine Selection</h2>
        {activeCount > 0 && (
          <button
            className="text-[10.5px] uppercase tracking-widest text-stone-500 hover:text-ink underline underline-offset-2"
            onClick={() => {
              setPriceRange(PRICE_RANGES[0]);
              onChange({ colorIds: [], sizeIds: [] });
            }}
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

      {/* Color Filter */}
      {colors.length > 0 && (
        <section>
          <h3 className="mb-3 text-[10.5px] font-medium uppercase tracking-widest text-stone-600">
            Color Palette
          </h3>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const on = value.colorIds.includes(c.id);
              return (
                <button
                  key={c.id}
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
          <h3 className="mb-3 text-[10.5px] font-medium uppercase tracking-widest text-stone-600">
            Garment Size
          </h3>
          <div className="grid grid-cols-4 gap-1.5 font-mono">
            {sizes.map((s) => {
              const on = value.sizeIds.includes(s.id);
              return (
                <button
                  key={s.id}
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
          {PRICE_RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => applyPrice(r)}
              className={cn(
                "block w-full text-left text-xs transition-colors py-1",
                priceRange.label === r.label
                  ? "text-ink font-medium underline underline-offset-4"
                  : "text-stone-500 hover:text-ink"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

export function ProductGrid({ products, loading }: { products: ProductSummary[]; loading?: boolean }) {
  if (loading) return <ProductGridSkeleton />;
  if (!products.length) {
    return (
      <EmptyState
        title="No pieces match those filters"
        body="Try resetting the color palette or widening the price range to explore the full collection."
      />
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}