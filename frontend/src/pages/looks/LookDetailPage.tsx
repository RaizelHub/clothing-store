import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ShoppingBag,
  Sparkles,
  ChevronLeft,
  AlertCircle,
  HelpCircle,
  Tag,
} from "lucide-react";
import { getLook } from "@/api/looks";
import { useAddLookToCart } from "@/hooks/useCart";
import { useUIStore } from "@/store/useUIStore";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OutfitItemDetail, ProductImage } from "@/types/api";

interface ItemSelectionState {
  included: boolean;
  colorId: number | null;
  sizeId: number | null;
  variantId: number | null;
  stock: number;
  price: string;
}

export function LookDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const openCart = useUIStore((s) => s.openCartDrawer);

  const { data: outfit, isLoading, isError } = useQuery({
    queryKey: ["look", slug],
    queryFn: () => getLook(slug || ""),
    enabled: Boolean(slug),
  });

  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Per-item selection map: key is product_id
  const [selections, setSelections] = useState<Record<number, ItemSelectionState>>({});

  // Initialize or update selection defaults once outfit loads
  useMemo(() => {
    if (!outfit) return;
    setSelections((prev) => {
      const next = { ...prev };
      for (const item of outfit.items) {
        if (!next[item.product.id]) {
          const firstColor = item.product.colors[0]?.id ?? null;
          // Find first in-stock variant
          const inStockVariant =
            item.product.variants.find((v) => v.stock > 0 && (!firstColor || v.color.id === firstColor)) ||
            item.product.variants[0];

          next[item.product.id] = {
            included: true,
            colorId: inStockVariant ? inStockVariant.color.id : firstColor,
            sizeId: inStockVariant ? inStockVariant.size.id : item.product.sizes[0]?.id ?? null,
            variantId: inStockVariant ? inStockVariant.id : null,
            stock: inStockVariant ? inStockVariant.stock : 0,
            price: item.product.sale_price || item.product.base_price,
          };
        }
      }
      return next;
    });
  }, [outfit]);

  const addLookMutation = useAddLookToCart();

  // Handle color change for an item
  const handleColorChange = (item: OutfitItemDetail, colorId: number) => {
    setSelections((prev) => {
      const current = prev[item.product.id];
      if (!current) return prev;

      // Find variant for this color and current size
      const variant =
        item.product.variants.find((v) => v.color.id === colorId && v.size.id === current.sizeId) ||
        item.product.variants.find((v) => v.color.id === colorId && v.stock > 0) ||
        item.product.variants.find((v) => v.color.id === colorId);

      return {
        ...prev,
        [item.product.id]: {
          ...current,
          colorId,
          sizeId: variant ? variant.size.id : current.sizeId,
          variantId: variant ? variant.id : null,
          stock: variant ? variant.stock : 0,
          price: variant?.price || item.product.sale_price || item.product.base_price,
        },
      };
    });
  };

  // Handle size change for an item
  const handleSizeChange = (item: OutfitItemDetail, sizeId: number) => {
    setSelections((prev) => {
      const current = prev[item.product.id];
      if (!current) return prev;

      const variant = item.product.variants.find(
        (v) => v.color.id === current.colorId && v.size.id === sizeId
      );

      return {
        ...prev,
        [item.product.id]: {
          ...current,
          sizeId,
          variantId: variant ? variant.id : null,
          stock: variant ? variant.stock : 0,
          price: variant?.price || item.product.sale_price || item.product.base_price,
        },
      };
    });
  };

  // Toggle item inclusion
  const handleToggleInclude = (productId: number) => {
    setSelections((prev) => {
      const current = prev[productId];
      if (!current) return prev;
      return {
        ...prev,
        [productId]: {
          ...current,
          included: !current.included,
        },
      };
    });
  };

  // Dynamic live pricing computation based on active selections
  const computedPricing = useMemo(() => {
    if (!outfit) {
      return {
        subtotal: 0,
        discount: 0,
        finalTotal: 0,
        isEligible: false,
        selectedCount: 0,
        allInStock: true,
      };
    }

    let subtotal = 0;
    let selectedCount = 0;
    let allInStock = true;

    for (const item of outfit.items) {
      const sel = selections[item.product.id];
      if (sel && sel.included) {
        selectedCount += 1;
        subtotal += Number(sel.price);
        if (sel.stock <= 0) allInStock = false;
      }
    }

    const req = outfit.bundle_min_items > 0 ? outfit.bundle_min_items : outfit.items.length;
    const isEligible =
      outfit.bundle_discount_type !== "none" &&
      Number(outfit.bundle_discount_value) > 0 &&
      selectedCount >= req &&
      selectedCount > 0;

    let discount = 0;
    if (isEligible) {
      if (outfit.bundle_discount_type === "percent") {
        discount = Math.round(subtotal * (Number(outfit.bundle_discount_value) / 100) * 100) / 100;
      } else if (outfit.bundle_discount_type === "fixed") {
        discount = Math.min(Number(outfit.bundle_discount_value), subtotal);
      }
    }

    const finalTotal = Math.max(0, subtotal - discount);

    return {
      subtotal,
      discount,
      finalTotal,
      isEligible,
      selectedCount,
      allInStock,
      requiredCount: req,
    };
  }, [outfit, selections]);

  // Handle Add to Cart submission
  const handleAddToCart = async () => {
    if (!outfit) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const itemsToAdd = outfit.items
      .map((item) => {
        const sel = selections[item.product.id];
        if (sel && sel.included && sel.variantId) {
          return {
            product_id: item.product.id,
            variant_id: sel.variantId,
            quantity: 1,
          };
        }
        return null;
      })
      .filter((it): it is { product_id: number; variant_id: number; quantity: number } => Boolean(it));

    if (!itemsToAdd.length) {
      setErrorMessage("Please select at least one item from the outfit.");
      return;
    }

    // Check client-side stock first
    for (const it of itemsToAdd) {
      const sel = selections[it.product_id];
      if (sel && sel.stock <= 0) {
        setErrorMessage("One or more selected sizes are out of stock. Please select an available size.");
        return;
      }
    }

    try {
      const res = await addLookMutation.mutateAsync({
        slug: outfit.slug,
        items: itemsToAdd,
      });

      setSuccessMessage(res.message);
      openCart();
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: { stock?: string[]; detail?: string; items?: string[] } } })
        ?.response?.data;
      const msg =
        errorData?.stock?.[0] ||
        errorData?.detail ||
        errorData?.items?.[0] ||
        "Failed to add outfit to bag. Please try again.";
      setErrorMessage(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="container-editorial py-16 animate-pulse space-y-8">
        <div className="h-6 w-48 bg-stone-100" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 h-[600px] bg-stone-100 rounded-sm" />
          <div className="lg:col-span-5 space-y-6">
            <div className="h-10 bg-stone-100" />
            <div className="h-24 bg-stone-100" />
            <div className="h-48 bg-stone-100" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !outfit) {
    return (
      <div className="container-editorial py-24 text-center space-y-4">
        <h1 className="text-2xl font-serif text-ink">Look Not Found</h1>
        <p className="text-xs text-stone-500">
          The curated outfit you are looking for may have been archived or is temporarily unavailable.
        </p>
        <Link
          to="/looks"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-ink underline mt-4"
        >
          <ChevronLeft size={14} />
          <span>Back to All Looks</span>
        </Link>
      </div>
    );
  }

  const primaryCover = activePhoto || outfit.cover_image;

  return (
    <div className="container-editorial py-8 md:py-14">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-stone-400 mb-8">
        <Link to="/" className="hover:text-ink transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link to="/looks" className="hover:text-ink transition-colors">
          Shop the Look
        </Link>
        <span>/</span>
        <span className="text-ink font-medium">{outfit.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-14 items-start">
        {/* Left Column: Editorial Imagery & Styling Advice */}
        <div className="lg:col-span-7 space-y-6 lg:sticky lg:top-24">
          {/* Main Editorial Image */}
          <div className="relative aspect-[4/5] bg-stone-100 border border-stone-200/90 overflow-hidden rounded-sm">
            <img
              src={primaryCover}
              alt={outfit.cover_image_alt || outfit.name}
              className="w-full h-full object-cover transition-opacity duration-300"
            />
            {outfit.bundle_pricing?.is_eligible && (
              <div className="absolute top-4 right-4 bg-ink/90 text-white text-[9px] uppercase tracking-[0.2em] px-3 py-1 font-medium backdrop-blur-sm">
                {outfit.bundle_pricing.savings_label}
              </div>
            )}
          </div>

          {/* Gallery Thumbnails (if multiple images exist) */}
          {outfit.gallery_images && outfit.gallery_images.length > 0 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setActivePhoto(outfit.cover_image)}
                className={cn(
                  "relative w-20 aspect-[4/5] border rounded-sm overflow-hidden shrink-0 transition-all",
                  primaryCover === outfit.cover_image
                    ? "border-ink ring-1 ring-ink"
                    : "border-stone-200 opacity-70 hover:opacity-100"
                )}
              >
                <img src={outfit.cover_image} alt="Main Angle" className="w-full h-full object-cover" />
              </button>
              {outfit.gallery_images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePhoto(img.url)}
                  className={cn(
                    "relative w-20 aspect-[4/5] border rounded-sm overflow-hidden shrink-0 transition-all",
                    primaryCover === img.url
                      ? "border-ink ring-1 ring-ink"
                      : "border-stone-200 opacity-70 hover:opacity-100"
                  )}
                >
                  <img src={img.url} alt={img.alt || `Angle ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Editorial Styling Callout */}
          <div className="border border-stone-200/80 bg-stone-50/60 p-6 rounded-sm space-y-2">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-stone-500 font-semibold">
              <Sparkles size={13} className="text-ink" />
              <span>Atelier Styling Director&apos;s Notes</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed italic">
              &ldquo;{outfit.description}&rdquo;
            </p>
          </div>
        </div>

        {/* Right Column: Interactive Look Selection & Bundle Checkout */}
        <div className="lg:col-span-5 space-y-8">
          {/* Header Info */}
          <div className="space-y-3 border-b border-stone-200 pb-6">
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-widest text-stone-400">
                {outfit.items.length} Coordinated Pieces
              </span>
              {outfit.bundle_discount_type !== "none" && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 border border-emerald-200 font-medium">
                  <Tag size={11} />
                  <span>
                    {outfit.bundle_discount_type === "percent"
                      ? `${outfit.bundle_discount_value}% Bundle Discount`
                      : `₱${outfit.bundle_discount_value} Bundle Discount`}
                  </span>
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-serif text-ink tracking-tight font-normal">
              {outfit.name}
            </h1>

            <p className="text-xs text-stone-600 leading-relaxed">
              Select your sizes and preferred colorways below. You may include all pieces for the full styling or tailor the set to your wardrobe needs.
            </p>
          </div>

          {/* Error / Success Feedback */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded animate-fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded animate-fade-in">
              <Check size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Individual Products Configuration List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-widest font-semibold text-ink">
                Included Garments
              </h2>
              <span className="text-[11px] text-stone-400">
                {computedPricing.selectedCount} of {outfit.items.length} selected
              </span>
            </div>

            <div className="space-y-4">
              {outfit.items.map((item) => {
                const sel = selections[item.product.id] || {
                  included: true,
                  colorId: item.product.colors[0]?.id ?? null,
                  sizeId: item.product.sizes[0]?.id ?? null,
                  variantId: null,
                  stock: 0,
                  price: item.product.sale_price || item.product.base_price,
                };

                const primaryImg = (
                  item.product.images.find((i: ProductImage) => i.color === sel.colorId && i.is_primary) ||
                  item.product.images.find((i: ProductImage) => i.color === sel.colorId) ||
                  item.product.images[0]
                )?.image;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "p-4 border rounded-sm transition-all bg-white space-y-4",
                      sel.included
                        ? "border-stone-300 shadow-sm"
                        : "border-stone-200/60 opacity-60 bg-stone-50/50"
                    )}
                  >
                    {/* Item Top Bar: Checkbox + Product Name + Price */}
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={sel.included}
                        onChange={() => handleToggleInclude(item.product.id)}
                        className="mt-1 h-4 w-4 rounded border-stone-300 text-ink focus:ring-ink"
                        id={`item-${item.id}`}
                      />

                      <div className="relative w-14 h-18 aspect-[3/4] bg-stone-100 border border-stone-200 shrink-0 overflow-hidden">
                        {primaryImg && (
                          <img src={primaryImg} alt={item.product.name} className="w-full h-full object-cover" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link
                              to={`/products/${item.product.slug}`}
                              className="text-xs font-medium text-ink hover:underline line-clamp-1"
                            >
                              {item.product.name}
                            </Link>
                            {item.is_featured_item && (
                              <span className="text-[9px] uppercase tracking-wider text-stone-500 font-medium">
                                Key Foundation Piece
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono font-medium text-ink">
                            {formatMoney(sel.price)}
                          </span>
                        </div>

                        {/* Styling note for this garment */}
                        {item.styling_note && (
                          <p className="mt-1 text-[11px] text-stone-500 italic leading-snug">
                            &ldquo;{item.styling_note}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Variant Selectors (Shown when item is included) */}
                    {sel.included && (
                      <div className="pt-2 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Color Selection */}
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1.5 font-medium">
                            Color:{" "}
                            <span className="text-ink">
                              {item.product.colors.find((c) => c.id === sel.colorId)?.name}
                            </span>
                          </label>
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.product.colors.map((color) => {
                              const isActive = sel.colorId === color.id;
                              return (
                                <button
                                  key={color.id}
                                  type="button"
                                  onClick={() => handleColorChange(item, color.id)}
                                  className={cn(
                                    "h-5 w-5 rounded-full border transition-all flex items-center justify-center",
                                    isActive
                                      ? "ring-2 ring-ink ring-offset-1 border-ink"
                                      : "border-stone-300 hover:scale-105"
                                  )}
                                  style={{ backgroundColor: color.hex }}
                                  title={color.name}
                                  aria-label={color.name}
                                >
                                  {isActive && (
                                    <Check
                                      size={10}
                                      className={cn(
                                        color.hex.toLowerCase() === "#ffffff" ||
                                          color.hex.toLowerCase() === "#efede7"
                                          ? "text-stone-900"
                                          : "text-white"
                                      )}
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Size Selection */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10px] uppercase tracking-wider text-stone-500 font-medium">
                              Size
                            </label>
                            {sel.stock > 0 && sel.stock <= 3 && (
                              <span className="text-[9px] text-amber-700 font-mono">
                                Only {sel.stock} left
                              </span>
                            )}
                            {sel.stock <= 0 && (
                              <span className="text-[9px] text-rose-600 font-mono font-medium">
                                Out of stock
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.product.sizes.map((size) => {
                              const variant = item.product.variants.find(
                                (v) => v.color.id === sel.colorId && v.size.id === size.id
                              );
                              const isOutOfStock = !variant || variant.stock <= 0;
                              const isSelected = sel.sizeId === size.id;

                              return (
                                <button
                                  key={size.id}
                                  type="button"
                                  disabled={isOutOfStock}
                                  onClick={() => handleSizeChange(item, size.id)}
                                  className={cn(
                                    "px-2.5 py-1 text-[11px] uppercase tracking-wider border rounded-xs transition-all",
                                    isSelected
                                      ? "bg-ink text-white border-ink font-medium"
                                      : isOutOfStock
                                      ? "opacity-30 border-stone-200 cursor-not-allowed line-through"
                                      : "border-stone-200 text-stone-700 hover:border-stone-400"
                                  )}
                                >
                                  {size.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Order Summary & Checkout Card */}
          <div className="border border-stone-300 bg-stone-50/70 p-6 rounded-sm space-y-4">
            <h3 className="text-xs uppercase tracking-widest font-semibold text-ink border-b border-stone-200/80 pb-2.5">
              Curated Look Total
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-stone-600">
                <span>Selected Items ({computedPricing.selectedCount})</span>
                <span className="font-mono">{formatMoney(computedPricing.subtotal)}</span>
              </div>

              {computedPricing.isEligible ? (
                <div className="flex items-center justify-between text-emerald-700 font-medium">
                  <span className="flex items-center gap-1">
                    <Sparkles size={12} />
                    <span>{outfit.bundle_pricing?.savings_label || "Bundle Savings"}</span>
                  </span>
                  <span className="font-mono">-{formatMoney(computedPricing.discount)}</span>
                </div>
              ) : outfit.bundle_discount_type !== "none" && computedPricing.selectedCount > 0 ? (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 p-2 border border-amber-200/80 rounded">
                  <HelpCircle size={13} className="shrink-0" />
                  <span>
                    Select {(computedPricing.requiredCount ?? 2) - computedPricing.selectedCount} more item to unlock{" "}
                    {outfit.bundle_discount_type === "percent"
                      ? `${outfit.bundle_discount_value}%`
                      : `₱${outfit.bundle_discount_value}`}{" "}
                    bundle savings!
                  </span>
                </div>
              ) : null}

              <div className="pt-2 border-t border-stone-200 flex items-baseline justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-ink">
                    Set Price
                  </span>
                  <p className="text-[10px] text-stone-400">VAT inclusive &bull; Free domestic shipping</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-serif text-ink font-semibold font-mono">
                    {formatMoney(computedPricing.finalTotal)}
                  </span>
                  {computedPricing.isEligible && (
                    <span className="block text-[11px] line-through text-stone-400 font-mono">
                      {formatMoney(computedPricing.subtotal)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action CTA */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={
                addLookMutation.isPending ||
                computedPricing.selectedCount === 0 ||
                !computedPricing.allInStock
              }
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-ink text-white text-xs uppercase tracking-widest font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingBag size={15} />
              <span>
                {addLookMutation.isPending
                  ? "Adding Look to Bag..."
                  : !computedPricing.allInStock
                  ? "Selected Size Out of Stock"
                  : computedPricing.selectedCount === 0
                  ? "Select Items to Continue"
                  : `Add Entire Look to Bag (${computedPricing.selectedCount} ${
                      computedPricing.selectedCount === 1 ? "piece" : "pieces"
                    })`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
