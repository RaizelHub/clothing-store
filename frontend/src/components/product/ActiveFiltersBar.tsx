import { X } from "lucide-react";
import type { Category, Color, Size } from "@/types/api";
import type { FilterState } from "@/hooks/useProductFilterParams";
import { formatMoney } from "@/lib/format";

interface ActiveFiltersBarProps {
  filters: FilterState;
  colors?: Color[];
  sizes?: Size[];
  categories?: Category[];
  onRemove: (key: keyof FilterState, value?: any) => void;
  onClearAll: () => void;
  resultCount?: number | null;
  className?: string;
}

export function ActiveFiltersBar({
  filters,
  colors = [],
  sizes = [],
  categories = [],
  onRemove,
  onClearAll,
  resultCount,
  className = "",
}: ActiveFiltersBarProps) {
  // Collect all removable chips
  const chips: { id: string; label: string; onRemove: () => void }[] = [];

  // Search query
  if (filters.q && filters.q.trim()) {
    chips.push({
      id: "q",
      label: `"${filters.q}"`,
      onRemove: () => onRemove("q"),
    });
  }

  // Category
  if (filters.category) {
    const matched = categories.find((c) => c.slug === filters.category);
    chips.push({
      id: "category",
      label: `Category: ${matched?.name || filters.category}`,
      onRemove: () => onRemove("category"),
    });
  }

  // In Stock Only
  if (filters.inStockOnly) {
    chips.push({
      id: "in_stock",
      label: "In Stock Only",
      onRemove: () => onRemove("inStockOnly"),
    });
  }

  // New Arrivals
  if (filters.newOnly) {
    chips.push({
      id: "new",
      label: "New Arrivals",
      onRemove: () => onRemove("newOnly"),
    });
  }

  // Price range
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    let priceLabel = "";
    if (filters.priceMin !== undefined && filters.priceMax !== undefined) {
      priceLabel = `${formatMoney(filters.priceMin)} – ${formatMoney(filters.priceMax)}`;
    } else if (filters.priceMin !== undefined) {
      priceLabel = `Over ${formatMoney(filters.priceMin)}`;
    } else if (filters.priceMax !== undefined) {
      priceLabel = `Under ${formatMoney(filters.priceMax)}`;
    }
    chips.push({
      id: "price",
      label: `Price: ${priceLabel}`,
      onRemove: () => {
        onRemove("priceMin");
        onRemove("priceMax");
      },
    });
  }

  // Colors
  filters.colorIds.forEach((colorId) => {
    const c = colors.find((item) => item.id === colorId);
    chips.push({
      id: `color-${colorId}`,
      label: `Color: ${c?.name || colorId}`,
      onRemove: () => onRemove("colorIds", colorId),
    });
  });

  // Sizes
  filters.sizeIds.forEach((sizeId) => {
    const s = sizes.find((item) => item.id === sizeId);
    chips.push({
      id: `size-${sizeId}`,
      label: `Size: ${s?.name || sizeId}`,
      onRemove: () => onRemove("sizeIds", sizeId),
    });
  });

  if (chips.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 pt-1 pb-4 ${className}`}>
      <span className="text-[10px] uppercase tracking-widest text-stone-400 font-mono mr-1">
        Active Filters:
      </span>

      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1.5 border border-stone-300 bg-stone-50/70 px-2.5 py-1 text-[11px] uppercase tracking-wider text-ink transition-colors hover:border-ink hover:bg-stone-100"
          title={`Remove ${chip.label}`}
        >
          <span>{chip.label}</span>
          <X size={12} className="text-stone-400 group-hover:text-ink" />
        </button>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="ml-auto text-[10.5px] uppercase tracking-widest text-stone-500 hover:text-ink underline underline-offset-4"
      >
        Clear all ({chips.length})
      </button>

      {resultCount !== undefined && resultCount !== null && (
        <span className="text-[11px] font-mono text-stone-400 pl-2 hidden sm:inline">
          · {resultCount} {resultCount === 1 ? "piece" : "pieces"}
        </span>
      )}
    </div>
  );
}
