import type { ProductImage, ProductImageUrls } from "@/types/api";

export type ImagePreset = keyof ProductImageUrls;

/**
 * Returns the optimized Cloudinary delivery URL for a preset when available,
 * falling back gracefully to the raw image URL for local/mock/legacy assets.
 */
export function getImageUrl(
  img: ProductImage | undefined | null,
  preset: ImagePreset = "card"
): string {
  if (!img) return "";
  return img.urls?.[preset] || img.image || "";
}

/**
 * Builds a responsive srcSet string for Cloudinary-backed images so browsers pick
 * the best resolution for mobile vs desktop viewports without oversized downloads.
 */
export function getImageSrcSet(img: ProductImage | undefined | null): string | undefined {
  if (!img?.urls || img.storage_provider !== "cloudinary") return undefined;
  const entries = [
    `${img.urls.thumbnail} 320w`,
    `${img.urls.card} 640w`,
    `${img.urls.mobile} 750w`,
    `${img.urls.detail} 1200w`,
    `${img.urls.large} 1800w`,
  ];
  return entries.join(", ");
}

/**
 * Resolves the primary and hover images for storefront product cards,
 * respecting selected color swatches and primary image selection with graceful fallback.
 */
export function getProductCardImages(
  images: ProductImage[],
  activeColorId: number | null
): { primary?: ProductImage; hover?: ProductImage } {
  if (!images.length) return {};

  const sorted = [...images].sort((a, b) => a.position - b.position);
  const primaryFallback = sorted.find((i) => i.is_primary) ?? sorted[0];

  if (activeColorId !== null) {
    const colorMatched = sorted.filter((i) => i.color === activeColorId);
    if (colorMatched.length > 0) {
      const first = colorMatched.find((i) => i.is_primary) ?? colorMatched[0];
      const second = colorMatched.find((i) => i.id !== first.id) ?? sorted.find((i) => i.id !== first.id);
      return { primary: first, hover: second };
    }
  }

  const hover = sorted.find((i) => i.id !== primaryFallback.id);
  return { primary: primaryFallback, hover };
}

/**
 * Resolves the ordered gallery images for a product detail page.
 * - Shows variant color-specific images first when a color is selected.
 * - Preserves shared general gallery images (color === null) alongside variant shots.
 * - Gracefully falls back to main gallery images when a color has no dedicated photos.
 */
export function getProductDetailImages(
  images: ProductImage[],
  colorId: number | null
): ProductImage[] {
  if (!images.length) return [];

  const sorted = [...images].sort((a, b) => a.position - b.position);
  const prioritizePrimary = (list: ProductImage[]) => {
    const prim = list.find((i) => i.is_primary);
    if (!prim) return list;
    return [prim, ...list.filter((i) => i.id !== prim.id)];
  };

  if (colorId !== null) {
    const colorMatched = sorted.filter((i) => i.color === colorId);
    const general = sorted.filter((i) => i.color === null);
    if (colorMatched.length > 0) {
      return [...prioritizePrimary(colorMatched), ...general];
    }
    if (general.length > 0) {
      return prioritizePrimary(general);
    }
  }

  return prioritizePrimary(sorted);
}
