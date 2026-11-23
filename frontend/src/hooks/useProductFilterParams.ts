import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { SortOption } from "@/components/product/ProductGrid";

export interface FilterState {
  sort: SortOption;
  colorIds: number[];
  sizeIds: number[];
  priceMin?: number;
  priceMax?: number;
  inStockOnly: boolean;
  newOnly: boolean;
  category?: string;
  q?: string;
}

export function useProductFilterParams(defaultSort: SortOption = "featured") {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<FilterState>(() => {
    const rawSort = searchParams.get("sort") as SortOption | null;
    const sort: SortOption =
      rawSort && ["featured", "newest", "price-asc", "price-desc", "bestselling"].includes(rawSort)
        ? rawSort
        : defaultSort;

    const rawColor = searchParams.get("color");
    const colorIds = rawColor
      ? rawColor
          .split(",")
          .map((x) => parseInt(x.trim(), 10))
          .filter((n) => !isNaN(n) && n > 0)
      : [];

    const rawSize = searchParams.get("size");
    const sizeIds = rawSize
      ? rawSize
          .split(",")
          .map((x) => parseInt(x.trim(), 10))
          .filter((n) => !isNaN(n) && n > 0)
      : [];

    const rawMin = searchParams.get("min_price");
    const priceMin = rawMin && !isNaN(Number(rawMin)) ? Number(rawMin) : undefined;

    const rawMax = searchParams.get("max_price");
    const priceMax = rawMax && !isNaN(Number(rawMax)) ? Number(rawMax) : undefined;

    const inStockOnly = searchParams.get("in_stock") === "true";
    const newOnly = searchParams.get("new") === "true";
    const category = searchParams.get("category") || undefined;
    const q = searchParams.get("q") || undefined;

    return {
      sort,
      colorIds,
      sizeIds,
      priceMin,
      priceMax,
      inStockOnly,
      newOnly,
      category,
      q,
    };
  }, [searchParams, defaultSort]);

  const updateFilters = useCallback(
    (updates: Partial<FilterState>, replace = true) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          if ("sort" in updates) {
            if (updates.sort && updates.sort !== defaultSort) {
              next.set("sort", updates.sort);
            } else {
              next.delete("sort");
            }
          }

          if ("colorIds" in updates) {
            if (updates.colorIds && updates.colorIds.length > 0) {
              next.set("color", updates.colorIds.join(","));
            } else {
              next.delete("color");
            }
          }

          if ("sizeIds" in updates) {
            if (updates.sizeIds && updates.sizeIds.length > 0) {
              next.set("size", updates.sizeIds.join(","));
            } else {
              next.delete("size");
            }
          }

          if ("priceMin" in updates) {
            if (updates.priceMin !== undefined && updates.priceMin !== null) {
              next.set("min_price", String(updates.priceMin));
            } else {
              next.delete("min_price");
            }
          }

          if ("priceMax" in updates) {
            if (updates.priceMax !== undefined && updates.priceMax !== null) {
              next.set("max_price", String(updates.priceMax));
            } else {
              next.delete("max_price");
            }
          }

          if ("inStockOnly" in updates) {
            if (updates.inStockOnly) {
              next.set("in_stock", "true");
            } else {
              next.delete("in_stock");
            }
          }

          if ("newOnly" in updates) {
            if (updates.newOnly) {
              next.set("new", "true");
            } else {
              next.delete("new");
            }
          }

          if ("category" in updates) {
            if (updates.category) {
              next.set("category", updates.category);
            } else {
              next.delete("category");
            }
          }

          if ("q" in updates) {
            if (updates.q && updates.q.trim()) {
              next.set("q", updates.q.trim());
            } else {
              next.delete("q");
            }
          }

          // Always reset page to 1 when changing filters
          next.delete("page");

          return next;
        },
        { replace }
      );
    },
    [setSearchParams, defaultSort]
  );

  const resetAllFilters = useCallback(
    (preservedKeys: (keyof FilterState)[] = []) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams();
          for (const key of preservedKeys) {
            const paramName =
              key === "colorIds"
                ? "color"
                : key === "sizeIds"
                ? "size"
                : key === "inStockOnly"
                ? "in_stock"
                : key === "newOnly"
                ? "new"
                : key === "priceMin"
                ? "min_price"
                : key === "priceMax"
                ? "max_price"
                : key;
            const val = prev.get(paramName);
            if (val) next.set(paramName, val);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  return {
    filters,
    updateFilters,
    resetAllFilters,
  };
}
