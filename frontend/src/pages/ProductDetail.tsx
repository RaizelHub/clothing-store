import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Ruler, Heart, Truck, RefreshCw } from "lucide-react";
import { getProduct, getProducts, submitReview } from "@/api/products";
import { ProductGallery } from "@/components/product/ProductGallery";
import { VariantPicker } from "@/components/product/VariantPicker";
import { SizeGuide } from "@/components/product/SizeGuide";
import { Button } from "@/components/ui/Button";
import { QuantityStepper, EmptyState, Notice, Stars, Skeleton } from "@/components/ui/misc";
import { ProductGrid } from "@/components/product/ProductGrid";
import { useUIStore } from "@/store/useUIStore";
import { useAddToCart } from "@/hooks/useCart";
import { useWishlist, useWishlistActions } from "@/hooks/useWishlist";
import { trackRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useSession } from "@/hooks/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reviewSchema, type ReviewInput } from "@/lib/validation";
import { getApiErrorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { getProductDetailImages } from "@/lib/images";
import { cn } from "@/lib/utils";

export function ProductDetailPage() {
  const { slug = "" } = useParams();
  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["products", slug],
    queryFn: () => getProduct(slug),
    enabled: Boolean(slug),
  });

  const [colorId, setColorId] = useState<number | null>(null);
  const [sizeId, setSizeId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [addNotice, setAddNotice] = useState<string | null>(null);

  const addToCart = useAddToCart();
  const openCartDrawer = useUIStore((s) => s.openCartDrawer);

  useEffect(() => {
    if (!product) return;
    trackRecentlyViewed(product);
    setColorId(product.colors[0]?.id ?? null);
    setSizeId(null);
    setQty(1);
    setAddNotice(null);
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Structured data for SEO
  useEffect(() => {
    if (!product) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "product-jsonld";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.tagline,
      image: product.images.map((i) => i.image),
      offers: {
        "@type": "Offer",
        price: product.price_effective,
        priceCurrency: "PHP",
        availability: product.variants.some((v) => v.stock > 0)
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      },
    });
    document.head.appendChild(script);
    return () => {
      document.getElementById("product-jsonld")?.remove();
    };
  }, [product]);

  const selectedVariant = useMemo(
    () => product?.variants.find((v) => v.color.id === colorId && v.size.id === sizeId) ?? null,
    [product, colorId, sizeId]
  );

  const selectedImages = useMemo(
    () => (product ? getProductDetailImages(product.images, colorId) : []),
    [product, colorId]
  );

  const handleAdd = () => {
    if (!product) return;
    if (!colorId || !sizeId) {
      setAddNotice("Please select a size to proceed.");
      return;
    }
    if (!selectedVariant || selectedVariant.stock === 0) {
      setAddNotice("That variant combination is currently out of stock.");
      return;
    }
    setAddNotice(null);
    addToCart.mutate(
      { variant_id: selectedVariant.id, quantity: qty },
      {
        onSuccess: () => openCartDrawer(),
        onError: (e) => setAddNotice(getApiErrorMessage(e)),
      }
    );
  };

  return (
    <section className="container-editorial py-8 sm:py-12 md:py-16">
      {isLoading && (
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <Skeleton className="aspect-[4/5] w-full" />
          </div>
          <div className="md:col-span-5 space-y-6">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      )}

      {isError && (
        <EmptyState
          title="Product not found"
          body="This piece may have completed its production run or the link is expired."
          action={
            <Link to="/new" className="text-xs uppercase tracking-widest underline underline-offset-4">
              Explore new arrivals
            </Link>
          }
        />
      )}

      {product && (
        <div className="grid gap-12 md:grid-cols-12 lg:gap-16 items-start">
          {/* Left Column: Vertical Editorial Gallery */}
          <div className="md:col-span-7">
            <ProductGallery images={selectedImages} alt={product.name} />
          </div>

          {/* Right Column: Sticky Purchasing Column */}
          <div className="md:col-span-5 md:sticky md:top-28 space-y-8">
            {/* Category breadcrumb */}
            <div>
              <nav className="text-[10.5px] uppercase tracking-widest text-stone-400 font-mono">
                <Link to={`/category/${product.category_slug}`} className="transition-colors hover:text-ink">
                  {product.category_name}
                </Link>
                <span className="mx-2 text-stone-300">/</span>
                <span>Capsule 01</span>
              </nav>

              <h1 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight text-ink">
                {product.name}
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-stone-500 leading-relaxed">
                {product.tagline}
              </p>

              {/* Price */}
              <div className="mt-4 flex items-baseline gap-3 font-mono">
                <span className={cn("text-2xl font-normal", product.sale_price && "text-accent font-medium")}>
                  {formatMoney(product.price_effective)}
                </span>
                {product.sale_price && (
                  <span className="text-sm text-stone-400 line-through">
                    {formatMoney(product.base_price)}
                  </span>
                )}
                {product.sale_price && (
                  <span className="text-[10px] uppercase tracking-widest text-accent font-medium bg-accent-subtle px-2 py-0.5">
                    Sale
                  </span>
                )}
              </div>

              {/* Rating summary */}
              {product.average_rating !== null && (
                <div className="mt-2.5 flex items-center gap-2 text-xs text-stone-500">
                  <Stars value={product.average_rating} />
                  <span className="text-[11px] font-mono">
                    ({product.review_count} {product.review_count === 1 ? "review" : "reviews"})
                  </span>
                </div>
              )}
            </div>

            {/* Variant Picker (Color & Size) */}
            <div className="border-t border-stone-200 pt-6">
              <VariantPicker
                variants={product.variants}
                colors={product.colors}
                sizes={product.sizes}
                selectedColorId={colorId}
                selectedSizeId={sizeId}
                onColor={(id) => {
                  setColorId(id);
                  setSizeId(null);
                }}
                onSize={setSizeId}
              />
            </div>

            {/* Model note & Size Guide trigger */}
            <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
              <span className="text-[11px]">Model is 178 cm / 5'10" and wears size S</span>
              <button
                type="button"
                onClick={() => setSizeGuideOpen(true)}
                className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink hover:underline underline-offset-4"
              >
                <Ruler size={13} strokeWidth={1.5} /> Size Guide
              </button>
            </div>

            {/* Purchasing Action Bar */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <QuantityStepper value={qty} max={selectedVariant?.stock ?? 10} onChange={setQty} />
                <Button
                  size="lg"
                  className="flex-1 py-4"
                  onClick={handleAdd}
                  loading={addToCart.isPending}
                  disabled={!product.variants.some((v) => v.stock > 0)}
                >
                  {selectedVariant && selectedVariant.stock === 0 ? "Sold out" : "Add to Bag"}
                </Button>
                <WishlistButton productId={product.id} />
              </div>

              {addNotice && (
                <div className="animate-fade-in">
                  <Notice tone="error">{addNotice}</Notice>
                </div>
              )}

              {/* Guarantees */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-[10.5px] uppercase tracking-widest text-stone-500 font-mono">
                <div className="flex items-center gap-2">
                  <Truck size={13} strokeWidth={1.5} /> Express Worldwide
                </div>
                <div className="flex items-center gap-2">
                  <RefreshCw size={13} strokeWidth={1.5} /> 30-Day Returns
                </div>
              </div>
            </div>

            {/* Editorial Accordions */}
            <div className="border-t border-stone-200 pt-2">
              <Accordion
                items={[
                  {
                    title: "Atelier Sourcing & Fabric",
                    body: product.description || "100% noble fiber fabrication. Sourced from certified European heritage mills.",
                  },
                  {
                    title: "Fit & Silhouette",
                    body: product.fit || "Tailored fit with relaxed drape for layering ease.",
                  },
                  {
                    title: "Care & Maintenance",
                    body: product.care || "Dry clean or gentle hand wash cold with silk/wool detergent. Lay flat to dry.",
                  },
                  {
                    title: "Complimentary Delivery & Returns",
                    body: "Complimentary express courier delivery on qualifying orders. Pre-paid return labels included in all parcels.",
                  },
                ]}
              />
            </div>

            {/* Reviews Section */}
            <ReviewsSection productSlug={product.slug} />
          </div>
        </div>
      )}

      {/* Floating Sticky Add-to-Bag Bar for Mobile */}
      {product && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-paper/95 backdrop-blur-md border-t border-stone-200 p-4 md:hidden shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="block text-xs font-medium text-ink truncate max-w-[150px]">
                {product.name}
              </span>
              <span className="text-xs font-mono text-stone-500">
                {formatMoney(product.price_effective)}
              </span>
            </div>
            <Button
              size="md"
              className="flex-1 py-3"
              onClick={handleAdd}
              loading={addToCart.isPending}
            >
              Add to Bag
            </Button>
          </div>
        </div>
      )}

      {/* Related Products Grid */}
      {product && <RelatedProducts categorySlug={product.category_slug} currentId={product.id} />}

      {/* Size Guide Modal */}
      <SizeGuide open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
    </section>
  );
}

function WishlistButton({ productId }: { productId: number }) {
  const { data: wishlist = [] } = useWishlist();
  const { add, remove } = useWishlistActions();
  const wished = wishlist.some((w) => w.product.id === productId);
  return (
    <button
      type="button"
      aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
      onClick={() => (wished ? remove.mutate(productId) : add.mutate(productId))}
      className={cn(
        "flex size-12 items-center justify-center border transition-all duration-300",
        wished
          ? "border-ink bg-ink text-paper"
          : "border-stone-300 text-ink/70 hover:border-ink hover:text-ink bg-paper"
      )}
    >
      <Heart size={18} strokeWidth={1.5} fill={wished ? "currentColor" : "none"} />
    </button>
  );
}

function Accordion({ items }: { items: { title: string; body: string }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="border-t border-stone-200 divide-y divide-stone-200">
      {items.map((item, i) => (
        <div key={item.title} className="py-1">
          <button
            type="button"
            onClick={() => setOpen(open === i ? -1 : i)}
            className="flex w-full items-center justify-between py-3.5 text-left text-xs uppercase tracking-widest text-ink font-medium"
          >
            {item.title}
            <ChevronDown
              size={15}
              strokeWidth={1.5}
              className={cn("transition-transform duration-300 ease-editorial", open === i && "rotate-180")}
            />
          </button>
          {open === i && (
            <p className="pb-4 text-xs leading-relaxed text-stone-600 animate-fade-in">
              {item.body}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function ReviewsSection({ productSlug }: { productSlug: string }) {
  const queryClient = useQueryClient();
  const { data: product } = useQuery({ queryKey: ["products", productSlug], queryFn: () => getProduct(productSlug) });
  const { data: me } = useSession();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReviewInput>({ resolver: zodResolver(reviewSchema), defaultValues: { rating: 5, comment: "" } });
  const rating = watch("rating");

  const submit = useMutation({
    mutationFn: (values: ReviewInput) => submitReview(productSlug, values),
    onSuccess: () => {
      setMessage({ ok: true, text: "Thank you — your review has been submitted for moderation." });
      reset();
      queryClient.invalidateQueries({ queryKey: ["products", productSlug] });
    },
    onError: (e) => setMessage({ ok: false, text: getApiErrorMessage(e) }),
  });

  return (
    <div className="mt-12 border-t border-stone-200 pt-8">
      <h2 className="text-xs uppercase tracking-widest font-medium text-ink">Client Reviews</h2>
      {product && product.reviews.length > 0 ? (
        <ul className="mt-6 space-y-6">
          {product.reviews.map((r) => (
            <li key={r.id} className="border-b border-stone-100 pb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink">{r.user_name}</span>
                <span className="text-[10.5px] font-mono text-stone-400">
                  {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <div className="mt-1">
                <Stars value={r.rating} size={11} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">{r.comment}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-stone-500">No client reviews yet. Be the first to share your experience.</p>
      )}

      <form className="mt-8 border border-stone-200 bg-paper p-5" onSubmit={handleSubmit((v) => submit.mutate(v))}>
        <h3 className="text-xs uppercase tracking-widest font-medium text-ink">Write a Review</h3>
        <p className="mt-1 text-[11px] text-stone-400">
          {me ? `Reviewing as ${me.email}` : "Share your feedback on fabric, cut, and fit."}
        </p>
        <div className="mt-3 flex items-center gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={Number(rating) === i}
              aria-label={`${i} star${i === 1 ? "" : "s"}`}
              onClick={() => reset({ rating: i, comment: watch("comment") })}
              className={cn("text-xl transition-colors duration-200", i <= (Number(rating) || 0) ? "text-ink" : "text-stone-300 hover:text-stone-400")}
            >
              ★
            </button>
          ))}
          {errors.rating && <span className="ml-3 text-xs text-accent">{errors.rating.message}</span>}
        </div>
        <textarea
          rows={3}
          placeholder="What are your impressions of the drape, material, and sizing?"
          {...register("comment")}
          className="mt-3 w-full border border-stone-300 bg-transparent p-3 text-xs placeholder:text-stone-400 focus:border-ink focus:outline-none"
        />
        {errors.comment && <p className="mt-1 text-[10.5px] text-accent">{errors.comment.message}</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Button type="submit" size="sm" loading={isSubmitting || submit.isPending}>
            Submit Review
          </Button>
          {message && <Notice tone={message.ok ? "success" : "error"}>{message.text}</Notice>}
        </div>
      </form>
    </div>
  );
}

function RelatedProducts({ categorySlug, currentId }: { categorySlug: string; currentId: number }) {
  const { data } = useQuery({
    queryKey: ["products", { category: categorySlug, page: 1 }],
    queryFn: () => getProducts({ category: categorySlug, page: 1 }),
  });
  const related = (data?.results ?? []).filter((p) => p.id !== currentId).slice(0, 4);
  if (!related.length) return null;
  return (
    <div className="mt-28 border-t border-stone-200 pt-16">
      <div className="mb-10 flex items-end justify-between border-b border-stone-200 pb-5">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-stone-500 font-medium">
            Considered Layering
          </p>
          <h2 className="mt-1 font-display text-3xl text-ink">You might also like</h2>
        </div>
      </div>
      <ProductGrid products={related} />
    </div>
  );
}