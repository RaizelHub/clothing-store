import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ProductSummary } from "@/types/api";
import { getProduct } from "@/api/products";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { getImageSrcSet, getImageUrl, getProductCardImages } from "@/lib/images";
import { useWishlist, useWishlistActions } from "@/hooks/useWishlist";
import { useAddToCart } from "@/hooks/useCart";
import { useUIStore } from "@/store/useUIStore";

function Price({ product }: { product: ProductSummary }) {
  const sale = product.sale_price !== null;
  return (
    <div className="flex items-baseline gap-2 font-mono">
      <span
        className={cn(
          "text-xs font-normal",
          sale ? "text-accent font-medium" : "text-ink",
        )}
      >
        {formatMoney(product.price_effective)}
      </span>
      {sale && (
        <span className="text-[11px] text-stone-400 line-through">
          {formatMoney(product.base_price)}
        </span>
      )}
    </div>
  );
}

export function ProductCard({ product }: { product: ProductSummary }) {
  const isSoldOut = product.in_stock === false || (product.badges && product.badges.includes("SOLD OUT"));
  const { data: wishlist = [] } = useWishlist();
  const { add, remove } = useWishlistActions();
  const wished = wishlist.some((w) => w.product.id === product.id);

  const [activeColorId, setActiveColorId] = useState<number | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const quickAddRef = useRef<HTMLButtonElement>(null);
  const closeSizeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (quickAddOpen) closeSizeRef.current?.focus();
  }, [quickAddOpen]);
  const [addingSizeId, setAddingSizeId] = useState<number | null>(null);

  const addToCart = useAddToCart();
  const openCartDrawer = useUIStore((s) => s.openCartDrawer);

  // Lazy query for variants when user opens Quick Add
  const { data: fullProduct, isLoading: loadingVariants } = useQuery({
    queryKey: ["products", product.slug],
    queryFn: () => getProduct(product.slug),
    enabled: quickAddOpen,
    staleTime: 5 * 60 * 1000,
  });

  const { primary: image, hover: hoverImage } = getProductCardImages(
    product.images,
    activeColorId,
  );
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [image?.id, activeColorId]);

  const handleQuickAddVariant = (sizeId: number) => {
    if (!fullProduct) return;
    const targetColorId = activeColorId ?? fullProduct.colors[0]?.id;
    // Find variant with matching size & color
    const variant =
      fullProduct.variants.find(
        (v) =>
          v.size.id === sizeId &&
          (targetColorId ? v.color.id === targetColorId : true),
      ) ?? fullProduct.variants.find((v) => v.size.id === sizeId);

    if (!variant || variant.stock === 0) return;

    setAddingSizeId(sizeId);
    addToCart.mutate(
      { variant_id: variant.id, quantity: 1 },
      {
        onSuccess: () => {
          setAddingSizeId(null);
          setQuickAddOpen(false);
          openCartDrawer();
        },
        onError: () => {
          setAddingSizeId(null);
        },
      },
    );
  };

  return (
    <article className="product-card group relative flex flex-col bg-paper">
      {/* Product Imagery Container */}
      <div className="product-image relative aspect-[4/5] overflow-hidden bg-stone-100 border border-stone-200/70 transition-all duration-500 ease-editorial group-hover:border-stone-400">
        <Link
          to={`/products/${product.slug}`}
          className="block size-full relative"
        >
          {image && !imgFailed ? (
            <img
              src={getImageUrl(image, "card")}
              srcSet={getImageSrcSet(image)}
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              alt={image.alt || product.name}
              loading="lazy"
              decoding="async"
              onError={() => setImgFailed(true)}
              className={cn(
                "absolute inset-0 size-full object-cover transition-all duration-700 ease-editorial",
                hoverImage && hoverImage !== image
                  ? "group-hover:opacity-0 group-hover:scale-[1.02]"
                  : "group-hover:scale-[1.02]",
              )}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-100 p-4 text-center">
              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                {product.name}
              </span>
            </div>
          )}
          {hoverImage && hoverImage !== image && !imgFailed && (
            <img
              src={getImageUrl(hoverImage, "card")}
              srcSet={getImageSrcSet(hoverImage)}
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              alt={hoverImage.alt || product.name}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover opacity-0 transition-all duration-700 ease-editorial group-hover:opacity-100 group-hover:scale-[1.02]"
            />
          )}
        </Link>

        {/* Badges: Top Left */}
        {product.badges.length > 0 && (
          <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-1 pointer-events-none">
            {product.badges.slice(0, 1).map((badge) => (
              <span
                key={badge}
                className={cn(
                  "px-2 py-0.5 text-[9px] uppercase tracking-widest font-mono font-medium",
                  badge === "SOLD OUT"
                    ? "bg-stone-900 text-stone-200 border border-stone-700 shadow-sm"
                    : badge === "SALE"
                    ? "bg-accent text-white"
                    : "bg-ink text-paper",
                )}
              >
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* Wishlist Button: Top Right */}
        <button
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          onClick={(e) => {
            e.preventDefault();
            if (wished) {
              remove.mutate(product.id);
            } else {
              add.mutate(product.id);
            }
          }}
          className={cn(
            "product-heart absolute right-3 top-3 z-10 flex size-10 items-center justify-center rounded-full backdrop-blur-md transition-all duration-300",
            wished
              ? "bg-ink text-paper shadow-sm"
              : "bg-paper/85 text-ink/70 hover:bg-paper hover:text-ink shadow-subtle opacity-80 group-hover:opacity-100",
          )}
        >
          <Heart
            size={14}
            strokeWidth={1.5}
            fill={wished ? "currentColor" : "none"}
          />
        </button>

        {/* Quick Add Bottom Bar / Trigger */}
        <div className="absolute inset-x-0 bottom-0 z-20 transition-all duration-300">
          {!quickAddOpen && (
            isSoldOut ? (
              <div className="w-full bg-stone-100/90 py-2.5 px-3 text-center text-[10.5px] uppercase tracking-widest text-stone-400 font-mono font-medium backdrop-blur-sm border-t border-stone-200/80 cursor-not-allowed">
                Sold Out
              </div>
            ) : (
              <button
                type="button"
                ref={quickAddRef}
                aria-expanded={quickAddOpen}
                onClick={() => setQuickAddOpen(true)}
                className="quick-add-trigger w-full bg-paper/95 py-2.5 px-3 text-center text-[10.5px] uppercase tracking-widest text-ink font-medium backdrop-blur-sm border-t border-stone-200/80 transition-all duration-300 hover:bg-ink hover:text-paper"
              >
                + Quick Add
              </button>
            )
          )}
          <div
            className={cn("quick-add-panel", quickAddOpen && "is-open")}
            aria-hidden={!quickAddOpen}
          >
            <div>
              <div className="bg-paper p-3 border-t border-stone-200 shadow-editorial animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-widest text-stone-500 font-medium">
                    Select Size
                  </span>
                  <button
                    ref={closeSizeRef}
                    aria-label="Close size selection"
                    tabIndex={quickAddOpen ? 0 : -1}
                    onClick={() => {
                      setQuickAddOpen(false);
                      requestAnimationFrame(() => quickAddRef.current?.focus());
                    }}
                    className="text-[10px] text-stone-400 hover:text-ink"
                  >
                    ✕
                  </button>
                </div>

                {loadingVariants ? (
                  <div className="flex items-center justify-center py-2 text-stone-400">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-1">
                    {(fullProduct?.sizes ?? product.sizes).map((size) => {
                      const targetColorId =
                        activeColorId ?? fullProduct?.colors[0]?.id;
                      const variant = fullProduct
                        ? (fullProduct.variants.find(
                            (v) =>
                              v.size.id === size.id &&
                              (targetColorId
                                ? v.color.id === targetColorId
                                : true),
                          ) ??
                          fullProduct.variants.find(
                            (v) => v.size.id === size.id,
                          ))
                        : undefined;
                      const isAvailable = variant ? variant.stock > 0 : true;
                      const isAdding = addingSizeId === size.id;

                      return (
                        <button
                          key={size.id}
                          type="button"
                          disabled={
                            !quickAddOpen || !isAvailable || addToCart.isPending
                          }
                          onClick={() => handleQuickAddVariant(size.id)}
                          className={cn(
                            "py-1.5 text-[10px] uppercase tracking-wider font-mono border transition-all duration-200",
                            isAvailable
                              ? "border-stone-200 hover:border-ink hover:bg-ink hover:text-paper text-ink"
                              : "border-stone-100 bg-stone-50 text-stone-300 line-through cursor-not-allowed",
                          )}
                        >
                          {isAdding ? (
                            <Loader2
                              size={10}
                              className="animate-spin mx-auto"
                            />
                          ) : (
                            size.name
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Metadata */}
      <div className="mt-3 flex flex-col gap-1">
        <div className="product-meta flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-normal text-ink line-clamp-1">
            <Link
              to={`/products/${product.slug}`}
              className="transition-colors hover:text-stone-600"
            >
              {product.name}
            </Link>
          </h3>
          <Price product={product} />
        </div>

        {/* Color Swatches */}
        {product.colors.length > 1 && (
          <div className="mt-1 flex items-center gap-1.5">
            {product.colors.map((color) => {
              const isSelected =
                (activeColorId ?? product.colors[0]?.id) === color.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  title={color.name}
                  aria-label={`Switch color to ${color.name}`}
                  aria-pressed={isSelected}
                  onMouseEnter={() => setActiveColorId(color.id)}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveColorId(color.id);
                  }}
                  className={cn(
                    "size-5 rounded-full border transition-all duration-200",
                    isSelected
                      ? "ring-1 ring-ink ring-offset-1 border-stone-400 scale-110"
                      : "border-stone-300 hover:scale-110 opacity-80",
                  )}
                  style={{ backgroundColor: color.hex }}
                />
              );
            })}
            <span className="text-[10px] text-stone-400 ml-1">
              {product.colors.length}{" "}
              {product.colors.length === 1 ? "color" : "colors"}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="aspect-[4/5] animate-pulse bg-stone-200/80" />
          <div className="h-3.5 w-3/4 animate-pulse bg-stone-200/80" />
          <div className="h-3 w-1/3 animate-pulse bg-stone-200/60" />
        </div>
      ))}
    </div>
  );
}
