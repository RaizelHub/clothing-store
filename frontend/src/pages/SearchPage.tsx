import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/api/products";
import { ProductGrid, SortSelect, type SortOption } from "@/components/product/ProductGrid";
import { EmptyState } from "@/components/ui/misc";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export function SearchPage() {
  const [params] = useSearchParams();
  const initial = params.get("q") ?? "";
  const [input, setInput] = useState(initial);
  const query = useDebouncedValue(input, 300);
  const [sort, setSort] = useState<SortOption>("newest");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", { q: query, sort }],
    queryFn: () => getProducts({ q: query, sort }),
    enabled: query.trim().length > 0,
    placeholderData: (prev) => prev,
  });

  const products = useMemo(() => data?.results ?? [], [data]);

  return (
    <section className="container-editorial py-12 md:py-16">
      <header className="mb-8">
        <h1 className="font-display text-4xl">Search</h1>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type to search the catalogue…"
          className="mt-6 w-full max-w-2xl border-b border-stone-300 bg-transparent pb-3 font-display text-2xl placeholder:text-stone-400 focus:border-ink focus:outline-none"
        />
      </header>

      {query.trim() === "" ? (
        <EmptyState title="Search the catalogue" body="Try a fabric — 'linen' — or a shape — 'oversized' — or a garment like 'coat'." />
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between border-b border-stone-200 pb-4">
            <p className="text-xs uppercase tracking-widest text-stone-400">
              {isLoading ? "Searching…" : `${data?.count ?? 0} results for "${query}"`}
            </p>
            <SortSelect value={sort} onChange={setSort} />
          </div>
          {isError ? (
            <p className="py-16 text-center text-sm text-accent">Search failed. Please try again.</p>
          ) : (
            <ProductGrid products={products} loading={isLoading} />
          )}
        </>
      )}
    </section>
  );
}