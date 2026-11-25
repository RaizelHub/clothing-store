import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, EyeOff, Trash2 } from "lucide-react";
import { deleteReview, listAdminReviews, setReviewStatus } from "@/api/admin";
import { Stars, Skeleton } from "@/components/ui/misc";
import { ErrorState } from "@/components/ui/StateViews";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type { ReviewStatus as Status } from "@/types/api";

const TABS: { key: Status | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "hidden", label: "Hidden" },
  { key: "all", label: "All" },
];

export function AdminReviews() {
  const [tab, setTab] = useState<Status | "all">("pending");
  const queryClient = useQueryClient();
  const { data: reviews, isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ["admin", "reviews", tab], queryFn: () => listAdminReviews(tab) });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Status }) => setReviewStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteReview(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">Reviews</h1>
        <p className="mt-1 text-sm text-stone-500">Approve, hide or remove customer reviews.</p>
      </header>

      <div className="flex gap-1 border-b border-stone-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "border-b-2 px-4 py-2 text-xs uppercase tracking-widest transition-colors",
              tab === t.key ? "border-ink text-ink" : "border-transparent text-stone-400 hover:text-stone-600"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isError ? (
          <ErrorState
            title="Reviews unavailable"
            message="Unable to load reviews for moderation."
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        ) : isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : !reviews || reviews.length === 0 ? (
          <div className="border border-dashed border-stone-200 py-12 text-center">
            <p className="text-sm font-medium text-stone-600">No {tab === "all" ? "" : `${tab} `}reviews</p>
            <p className="mt-1 text-xs text-stone-400">
              Customer submissions will be queued here for moderation.
            </p>
          </div>
        ) : (
          reviews.map((r) => (
            <article key={r.id} className="border border-stone-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <Stars value={r.rating} />
                    <span className="text-sm font-medium">{r.user_name}</span>
                    <span className={cn("text-xs uppercase tracking-widest", r.status === "pending" ? "text-amber-600" : r.status === "approved" ? "text-emerald-600" : "text-stone-400")}>
                      {r.status}
                    </span>
                  </div>
                  <Link to={`/products/${r.product}`} className="mt-1 block text-xs text-stone-500 hover:underline">
                    {r.product_name}
                  </Link>
                  <p className="mt-2 max-w-3xl text-sm text-stone-700">{r.comment}</p>
                  <p className="mt-1 text-xs text-stone-400">{formatDate(r.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  {r.status !== "approved" && (
                    <button
                      onClick={() => setStatus.mutate({ id: r.id, status: "approved" })}
                      className="flex items-center gap-1.5 border border-stone-300 px-3 py-1.5 text-xs uppercase tracking-widest hover:border-ink"
                    >
                      <Check size={12} strokeWidth={1.5} /> Approve
                    </button>
                  )}
                  {r.status !== "hidden" && (
                    <button
                      onClick={() => setStatus.mutate({ id: r.id, status: "hidden" })}
                      className="flex items-center gap-1.5 border border-stone-300 px-3 py-1.5 text-xs uppercase tracking-widest hover:border-ink"
                    >
                      <EyeOff size={12} strokeWidth={1.5} /> Hide
                    </button>
                  )}
                  <button onClick={() => remove.mutate(r.id)} aria-label="Delete review" className="flex items-center border border-stone-300 px-3 py-1.5 text-xs uppercase tracking-widest hover:border-accent hover:text-accent">
                    <Trash2 size={12} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}