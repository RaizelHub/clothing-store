import { useState } from "react";
import type { ProductImage } from "@/types/api";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, alt }: { images: ProductImage[]; alt: string }) {
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);

  if (!images.length) {
    return <div className="aspect-[4/5] bg-stone-100 border border-stone-200/80" aria-hidden />;
  }

  return (
    <div>
      {/* Desktop View: Stacked Vertical Editorial Gallery */}
      <div className="hidden md:flex flex-col gap-6">
        {images.map((img, i) => (
          <div
            key={img.id || i}
            className="relative overflow-hidden bg-stone-100 border border-stone-200/80 group"
          >
            <img
              src={img.image}
              alt={img.alt || `${alt} — View ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.01]"
            />
            <div className="absolute right-4 bottom-4 bg-ink/70 px-2.5 py-1 text-[9.5px] uppercase tracking-widest text-paper backdrop-blur-sm font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              0{i + 1} / 0{images.length}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile View: Swipeable Carousel with index bar */}
      <div className="md:hidden">
        <div className="relative aspect-[4/5] overflow-hidden bg-stone-100 border border-stone-200/80">
          <img
            src={images[activeMobileIndex]?.image}
            alt={images[activeMobileIndex]?.alt || alt}
            className="size-full object-cover transition-all duration-500"
          />
          <div className="absolute right-3 bottom-3 bg-ink/80 px-2.5 py-1 text-[10px] uppercase tracking-widest text-paper backdrop-blur-sm font-mono">
            0{activeMobileIndex + 1} / 0{images.length}
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
                  i === activeMobileIndex ? "border-ink ring-1 ring-ink" : "border-stone-200 opacity-60"
                )}
              >
                <img src={img.image} alt={img.alt} className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}