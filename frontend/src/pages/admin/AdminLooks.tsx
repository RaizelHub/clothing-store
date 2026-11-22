import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit3, ExternalLink, Sparkles, Layers } from "lucide-react";
import { getAdminLooks, deleteAdminLook } from "@/api/looks";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/fields";
import { Skeleton, EmptyState, Notice } from "@/components/ui/misc";
import { Modal } from "@/components/ui/Modal";
import { formatMoney } from "@/lib/format";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { OutfitSummary, OutfitStatus } from "@/types/api";

type StatusTab = "all" | OutfitStatus;

export function AdminLooks() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [lookToDelete, setLookToDelete] = useState<OutfitSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: looks, isLoading } = useQuery({
    queryKey: ["admin", "looks", activeTab],
    queryFn: () => getAdminLooks(activeTab),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => deleteAdminLook(id),
    onSuccess: () => {
      setLookToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "looks"] });
      queryClient.invalidateQueries({ queryKey: ["looks"] });
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.detail || "Failed to delete outfit.");
    },
  });

  // Client-side filter for quick search
  const filteredLooks = (looks || []).filter((l) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return l.name.toLowerCase().includes(q) || l.slug.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Shop the Look</h1>
          <p className="mt-1 text-xs text-stone-500 uppercase tracking-wider">
            Curate styled outfits, signature edits, and coordinated bundle promotions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search looks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
          <Button size="sm" onClick={() => navigate("/admin/looks/new")}>
            <Plus size={14} strokeWidth={1.5} /> New Outfit
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        {(["all", "published", "draft", "archived"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs uppercase tracking-widest font-medium transition-colors ${
              activeTab === tab
                ? "bg-ink text-paper"
                : "text-stone-500 hover:text-ink"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {actionError && (
        <Notice tone="error">{actionError}</Notice>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredLooks.length === 0 && (
        <EmptyState
          title="No Outfits Found"
          body={
            debouncedSearch
              ? `No looks matched "${debouncedSearch}".`
              : activeTab !== "all"
              ? `There are currently no looks with status "${activeTab}".`
              : "Create your first styled look to showcase coordinated outfits and bundle savings."
          }
          action={
            <Button size="sm" onClick={() => navigate("/admin/looks/new")}>
              <Plus size={14} /> Create Outfit
            </Button>
          }
        />
      )}

      {/* Outfit Grid */}
      {!isLoading && filteredLooks.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLooks.map((look) => {
            const hasBundle = look.bundle_discount_type !== "none";
            const bundleText =
              look.bundle_discount_type === "percent"
                ? `${look.bundle_discount_value}% Bundle Discount (min ${look.bundle_min_items} items)`
                : look.bundle_discount_type === "fixed"
                ? `${formatMoney(look.bundle_discount_value)} Bundle Discount (min ${look.bundle_min_items} items)`
                : null;

            return (
              <article
                key={look.id}
                className="group flex flex-col border border-stone-200 bg-paper transition-shadow hover:shadow-sm"
              >
                {/* Cover Image / Thumbnail */}
                <div className="relative aspect-[4/5] bg-stone-100 overflow-hidden">
                  {look.cover_image ? (
                    <img
                      src={look.cover_image}
                      alt={look.name}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center p-6 text-center text-xs text-stone-400 uppercase tracking-widest font-mono">
                      No cover image
                    </div>
                  )}

                  {/* Badges in Overlay */}
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                    <span
                      className={`px-2 py-0.5 text-[10px] uppercase tracking-widest font-medium ${
                        look.status === "published"
                          ? "bg-ink text-paper"
                          : look.status === "draft"
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-stone-200 text-stone-700"
                      }`}
                    >
                      {look.status}
                    </span>

                    {look.is_featured && (
                      <span className="inline-flex items-center gap-1 bg-paper/95 px-2 py-0.5 text-[10px] uppercase tracking-widest text-ink shadow-sm">
                        <Sparkles size={10} /> Featured
                      </span>
                    )}
                  </div>

                  {/* Items Count Pill */}
                  <div className="absolute bottom-2.5 right-2.5 bg-paper/90 px-2 py-0.5 text-[10px] uppercase tracking-widest text-stone-600 backdrop-blur-sm">
                    {look.items_count} {look.items_count === 1 ? "garment" : "garments"}
                  </div>
                </div>

                {/* Content Details */}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-base font-normal text-ink truncate">
                        {look.name}
                      </h2>
                      <p className="font-mono text-[11px] text-stone-400 truncate">
                        /looks/{look.slug}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-medium text-ink">
                        {formatMoney(look.total_price)}
                      </p>
                      <p className="text-[10px] text-stone-400 uppercase tracking-wider">
                        Full Look
                      </p>
                    </div>
                  </div>

                  {/* Bundle Discount Badge */}
                  {hasBundle ? (
                    <div className="mt-3 flex items-center gap-1.5 rounded bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800 border border-emerald-200/60">
                      <Layers size={12} className="shrink-0" />
                      <span className="truncate">{bundleText}</span>
                    </div>
                  ) : (
                    <div className="mt-3 text-[11px] text-stone-400">
                      Standard pricing (no bundle discount)
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-stone-100 text-xs">
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/admin/looks/${look.id}/edit`}
                        className="inline-flex items-center gap-1 text-stone-600 hover:text-ink font-medium uppercase tracking-wider text-[11px]"
                      >
                        <Edit3 size={13} /> Edit
                      </Link>

                      {look.status === "published" && (
                        <Link
                          to={`/looks/${look.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-stone-400 hover:text-ink text-[11px] uppercase tracking-wider"
                        >
                          View <ExternalLink size={11} />
                        </Link>
                      )}
                    </div>

                    <button
                      onClick={() => setLookToDelete(look)}
                      className="text-stone-400 hover:text-accent p-1 transition-colors"
                      title="Delete Outfit"
                      aria-label="Delete Outfit"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={lookToDelete !== null}
        onClose={() => setLookToDelete(null)}
        title="Delete Outfit"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Are you sure you want to delete{" "}
            <strong className="text-ink">{lookToDelete?.name}</strong>?
          </p>
          <p className="text-xs text-stone-400 leading-relaxed">
            Associated products and inventory are unaffected. Only the curated outfit presentation and its bundle configuration will be deleted.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLookToDelete(null)}
              disabled={removeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-accent text-accent hover:bg-accent hover:text-white"
              onClick={() => lookToDelete && removeMutation.mutate(lookToDelete.id)}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? "Deleting…" : "Confirm Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
