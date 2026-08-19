import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { deleteAdminProduct, listAdminProducts } from "@/api/admin";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/fields";
import { Badge, Skeleton } from "@/components/ui/misc";
import { formatMoney } from "@/lib/format";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export function AdminProducts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search, 300);
  const { data: products, isLoading } = useQuery({
    queryKey: ["admin", "products", q],
    queryFn: () => listAdminProducts(q),
    placeholderData: (prev) => prev,
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteAdminProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl">Products</h1>
        <div className="flex items-center gap-3">
          <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <Button size="sm" onClick={() => navigate("/admin/products/new")}>
            <Plus size={14} strokeWidth={1.5} /> New product
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && !products
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72" />)
          : products?.map((p) => (
              <article key={p.id} className="border border-stone-200">
                <Link to={`/admin/products/${p.id}/edit`} className="block">
                  <img src={p.images[0]?.image} alt={p.name} className="aspect-[4/5] w-full object-cover" />
                </Link>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/admin/products/${p.id}/edit`} className="text-sm font-medium hover:underline">
                        {p.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {p.variants.reduce((s, v) => s + v.stock, 0)} units · {p.variants.length} variants
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {p.is_new && <Badge>New</Badge>}
                        {p.is_featured && <Badge>Featured</Badge>}
                        {p.sale_price && <Badge tone="sale">Sale</Badge>}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm">{formatMoney(p.min_price)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
                    <Link to={`/admin/products/${p.id}/edit`} className="text-xs uppercase tracking-widest text-stone-500 hover:text-ink">
                      Edit
                    </Link>
                    <button
                      className="flex items-center gap-1 text-xs uppercase tracking-widest text-stone-400 transition-colors hover:text-accent"
                      onClick={() => remove.mutate(p.id)}
                    >
                      <Trash2 size={12} strokeWidth={1.5} /> Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
      </div>

      {!isLoading && products && products.length === 0 && (
        <p className="py-16 text-center text-sm text-stone-400">
          {q ? `Nothing matches "${q}".` : "No products yet."}
        </p>
      )}
    </div>
  );
}