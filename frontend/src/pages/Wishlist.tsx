import { Link } from "react-router-dom";
import { ArrowRight, Heart } from "lucide-react";
import { useSession } from "@/hooks/auth";
import { useWishlist, useWishlistActions } from "@/hooks/useWishlist";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/StateViews";

export function WishlistPage() {
  const { data: me } = useSession();
  const { data: wishlist, isLoading, isError, refetch, isFetching } = useWishlist();
  const { remove } = useWishlistActions();

  return (
    <section className="container-editorial py-12 sm:py-16">
      <header className="mb-10 border-b border-stone-200 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-stone-500 font-medium">
            Saved Pieces
          </p>
          <h1 className="mt-1 font-display text-4xl sm:text-5xl text-ink">Wishlist</h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-600">
            {wishlist?.length ? `${wishlist.length} pieces saved for later consideration` : "Saved for later"}
            {!me && " — sign in to access your wishlist across devices"}.
          </p>
        </div>

        {wishlist && wishlist.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => wishlist.forEach((w) => remove.mutate(w.product.id))}
          >
            Clear Wishlist
          </Button>
        )}
      </header>

      {isLoading ? (
        <ProductGrid products={[]} loading />
      ) : isError ? (
        <ErrorState
          title="Wishlist unavailable"
          message="We were unable to load your saved pieces. Please check your network connection and try again."
          onRetry={() => refetch()}
          isRetrying={isFetching}
          secondaryAction={{ label: "Discover New Arrivals", href: "/new" }}
        />
      ) : wishlist && wishlist.length > 0 ? (
        <ProductGrid products={wishlist.map((w) => w.product)} />
      ) : (
        <div className="py-16 text-center border border-stone-200/80 bg-paper p-12">
          <div className="flex size-12 items-center justify-center rounded-full bg-stone-100 mx-auto mb-4 text-stone-400">
            <Heart size={20} strokeWidth={1.5} />
          </div>
          <h2 className="font-display text-2xl text-ink">Your wishlist is empty</h2>
          <p className="mt-2 text-xs sm:text-sm text-stone-500 max-w-sm mx-auto leading-relaxed">
            Curate your personal wardrobe edit by tapping the heart on any noble garment across our collections.
          </p>
          <Link
            to="/new"
            className="mt-6 inline-flex items-center gap-2 bg-ink text-paper px-6 py-3 text-xs uppercase tracking-widest font-medium hover:bg-stone-800 transition-colors"
          >
            Discover New Arrivals <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </section>
  );
}