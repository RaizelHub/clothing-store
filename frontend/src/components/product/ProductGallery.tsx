import { useEffect, useState } from "react";
import type { ProductImage } from "@/types/api";
import { getImageSrcSet, getImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, alt }: { images: ProductImage[]; alt: string }) {
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);
  const [failedIds, setFailedIds] = useState<Record<number, boolean>>({});

  // Reset mobile slide index whenever selected color / image set changes
  useEffect(() => {
    setActiveMobileIndex(0);
    setFailedIds({});
  }, [images]);

  if (!images.length) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center border border-stone-200/80 bg-stone-100 p-8 text-center">
        <span className="font-mono text-xs uppercase tracking-widest text-stone-400">
          {alt}
        </span>
      </div>
    );
  }

  const safeMobileIndex = Math.min(activeMobileIndex, images.length - 1);
  const activeMobileImage = images[safeMobileIndex];

  return (
    <div>
      {/* Desktop View: Stacked Vertical Editorial Gallery */}
      <div className="hidden md:flex flex-col gap-6">
        {images.map((img, i) => {
          const isFailed = Boolean(failedIds[img.id || i]);
          return (
            <div
              key={img.id || i}
              className="relative aspect-[4/5] overflow-hidden border border-stone-200/80 bg-stone-100 group"
            >
              {!isFailed ? (
                <img
                  src={getImageUrl(img, "detail")}
                  srcSet={getImageSrcSet(img)}
                  sizes="(min-width: 1024px) 58vw, 60vw"
                  width={img.width ?? undefined}
                  height={img.height ?? undefined}
                  alt={img.alt || `${alt} — View ${i + 1}`}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding={i === 0 ? "sync" : "async"}
                  onError={() => setFailedIds((prev) => ({ ...prev, [img.id || i]: true }))}
                  className="size-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.01]"
                />
              ) : (
                <div className="flex size-full items-center justify-center p-6 text-center">
                  <span className="font-mono text-xs uppercase tracking-widest text-stone-400">
                    {img.alt || alt}
                  </span>
                </div>
              )}
              <div className="absolute bottom-4 right-4 bg-ink/70 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-widest text-paper opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                0{i + 1} / 0{images.length}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile View: Swipeable Carousel with index bar */}
      <div className="md:hidden">
        <div className="relative aspect-[4/5] overflow-hidden border border-stone-200/80 bg-stone-100">
          {activeMobileImage && !failedIds[activeMobileImage.id || safeMobileIndex] ? (
            <img
              src={getImageUrl(activeMobileImage, "mobile")}
              srcSet={getImageSrcSet(activeMobileImage)}
              sizes="100vw"
              width={activeMobileImage.width ?? undefined}
              height={activeMobileImage.height ?? undefined}
              alt={activeMobileImage.alt || alt}
              decoding="async"
              onError={() =>
                setFailedIds((prev) => ({
                  ...prev,
                  [activeMobileImage.id || safeMobileIndex]: true,
                }))
              }
              className="size-full object-cover transition-all duration-500"
            />
          ) : (
            <div className="flex size-full items-center justify-center p-6 text-center">
              <span className="font-mono text-xs uppercase tracking-widest text-stone-400">
                {activeMobileImage?.alt || alt}
              </span>
            </div>
          )}
          <div className="absolute bottom-3 right-3 bg-ink/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-paper backdrop-blur-sm">
            0{safeMobileIndex + 1} / 0{images.length}
          </div>
        </div>

        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={img.id || i}
                type="button"
                aria-label={`Show photo ${i + 1}`}
                onClick={() => setActiveMobileIndex(i)}
                className={cn(
                  "aspect-[4/5] w-14 shrink-0 overflow-hidden border transition-all duration-200",
                  i === safeMobileIndex ? "border-ink ring-1 ring-ink" : "border-stone-200 opacity-60"
                )}
              >
                <img
                  src={getImageUrl(img, "thumbnail")}
                  alt={img.alt || `${alt} thumbnail ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
