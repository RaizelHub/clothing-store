import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/api/products";
import type { ProductSummary } from "@/types/api";

const KEY = "studio_recently_viewed";
const MAX = 8;

export function trackRecentlyViewed(product: Pick<ProductSummary, "id" | "slug">): void {
  try {
    const ids = read();
    const next = [product.id, ...ids.filter((id) => id !== product.id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // private mode etc. — silently skip
  }
}

function read(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

export function useRecentlyViewed(enabled = true) {
  return useQuery({
    queryKey: ["recently-viewed", read().join(",")],
    queryFn: async () => {
      const ids = read();
      if (!ids.length) return [] as ProductSummary[];
      const res = await getProducts({ ids });
      return ids
        .map((id) => res.results.find((p) => p.id === id))
        .filter((p): p is ProductSummary => Boolean(p))
        .reverse();
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}