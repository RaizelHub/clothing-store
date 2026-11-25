import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getInventory, updateInventory } from "@/api/admin";
import { Input } from "@/components/ui/fields";
import { ErrorState, TableSkeleton } from "@/components/ui/StateViews";
import { cn } from "@/lib/utils";

export function InventoryPage() {
  const [params] = useSearchParams();
  const lowOnly = params.get("low") === "true";
  const queryClient = useQueryClient();
  const { data: rows, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin", "inventory", lowOnly],
    queryFn: () => getInventory(lowOnly),
  });
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const save = useMutation({
    mutationFn: ({ id, stock }: { id: number; stock: number }) => updateInventory(id, stock),
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Inventory</h1>
        <Link
          to={lowOnly ? "/admin/inventory" : "/admin/inventory?low=true"}
          className={cn(
            "border px-3 py-1.5 text-xs uppercase tracking-widest transition-colors",
            lowOnly ? "border-accent text-accent" : "border-stone-300 text-stone-500 hover:border-ink"
          )}
        >
          {lowOnly ? "Showing low stock only — view all" : "Low stock only"}
        </Link>
      </header>

      <div className="overflow-x-auto border border-stone-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-widest text-stone-500">
              <th className="px-5 py-3">Product</th>
              <th className="px-5 py-3">Colour / Size</th>
              <th className="px-5 py-3">SKU</th>
              <th className="px-5 py-3">Stock</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isError ? (
              <tr>
                <td colSpan={5} className="p-6">
                  <ErrorState
                    title="Inventory sync failed"
                    message="Unable to load SKU inventory quantities."
                    onRetry={() => refetch()}
                    isRetrying={isFetching}
                    compact
                  />
                </td>
              </tr>
            ) : isLoading ? (
              <TableSkeleton rows={6} cols={5} />
            ) : !rows || rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-stone-400">
                  <p className="text-sm font-medium text-stone-600">
                    {lowOnly ? "No low-stock items detected" : "No inventory recorded"}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    {lowOnly ? "All variant SKUs meet or exceed healthy stock thresholds." : "Register product variants to track quantities."}
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.variant_id} className={cn("border-b border-stone-100 last:border-0", r.low && "bg-accent/5")}>
                  <td className="px-5 py-3">
                    <Link to={`/admin/products/${r.product_id}/edit`} className="hover:underline">
                      {r.product_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-stone-500">
                    {r.color_name} / {r.size_name}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{r.sku}</td>
                  <td className="px-5 py-3">
                    {editing === r.variant_id ? (
                      <form
                        className="flex items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          save.mutate({ id: r.variant_id, stock: Number(draft) || 0 });
                        }}
                      >
                        <Input
                          autoFocus
                          type="number"
                          min="0"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          className="!w-24 !px-2 !py-1.5 text-xs"
                        />
                        <button type="submit" className="text-xs uppercase tracking-widest text-ink underline underline-offset-2">
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="text-xs uppercase tracking-widest text-stone-400 underline underline-offset-2"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => {
                          setEditing(r.variant_id);
                          setDraft(String(r.stock));
                        }}
                        className={cn("font-medium hover:underline", r.stock === 0 ? "text-accent" : "")}
                      >
                        {r.stock}
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn("text-xs uppercase tracking-widest", r.low ? "text-accent" : "text-stone-400")}>
                      {r.stock === 0 ? "Out" : r.low ? `Low (≤ ${r.threshold})` : "Ok"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}