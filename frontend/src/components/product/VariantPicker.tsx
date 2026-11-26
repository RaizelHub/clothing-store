import type { Color, Size, VariantSummary } from "@/types/api";
import { cn } from "@/lib/utils";
import { Ruler } from "lucide-react";

interface VariantPickerProps {
  variants: VariantSummary[];
  colors: Color[];
  sizes: Size[];
  selectedColorId: number | null;
  selectedSizeId: number | null;
  onColor: (id: number) => void;
  onSize: (id: number) => void;
  onOpenSizeGuide?: () => void;
}

export function VariantPicker({
  variants,
  colors,
  sizes,
  selectedColorId,
  selectedSizeId,
  onColor,
  onSize,
  onOpenSizeGuide,
}: VariantPickerProps) {
  const stockFor = (colorId: number, sizeId: number) =>
    variants.find((v) => v.color.id === colorId && v.size.id === sizeId)?.stock ?? 0;

  const currentVariant =
    selectedColorId !== null && selectedSizeId !== null
      ? variants.find((v) => v.color.id === selectedColorId && v.size.id === selectedSizeId)
      : undefined;

  const lowStock = currentVariant && currentVariant.stock > 0 && currentVariant.stock <= 3;
  const isOutOfStock = currentVariant && currentVariant.stock === 0;

  return (
    <div className="space-y-6">
      {/* 1. Color Palette Selector */}
      {colors.length > 0 && (
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-widest text-stone-500 font-medium">
              Colour —{" "}
              <span className="text-ink font-sans font-medium">
                {colors.find((c) => c.id === selectedColorId)?.name ?? "Select Palette"}
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((c) => {
              const hasStock = variants.some((v) => v.color.id === c.id && v.stock > 0);
              const on = selectedColorId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  disabled={!hasStock}
                  title={hasStock ? c.name : `${c.name} — Sold Out`}
                  aria-label={hasStock ? `Colour ${c.name}` : `Colour ${c.name}, Sold out`}
                  onClick={() => onColor(c.id)}
                  className={cn(
                    "size-7 rounded-full border border-stone-300 transition-all duration-200 relative",
                    on && "ring-1 ring-ink ring-offset-2 ring-offset-paper scale-110",
                    !hasStock && "cursor-not-allowed opacity-35"
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Size Selector */}
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-widest text-stone-500 font-medium">
            Size —{" "}
            <span className="text-ink font-mono font-medium">
              {sizes.find((s) => s.id === selectedSizeId)?.name ?? "Select Size"}
            </span>
          </span>
          {onOpenSizeGuide && (
            <button
              type="button"
              onClick={onOpenSizeGuide}
              className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-stone-500 hover:text-ink transition-colors underline-offset-4 hover:underline"
            >
              <Ruler size={13} strokeWidth={1.5} /> Size Guide
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 font-mono">
          {sizes.map((s) => {
            const inSelection = selectedColorId !== null;
            const stock = inSelection ? stockFor(selectedColorId, s.id) : 0;
            const out = inSelection && stock === 0;
            const on = selectedSizeId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                disabled={inSelection && out}
                title={
                  out
                    ? `${s.name} — Sold Out`
                    : inSelection
                      ? `${s.name} — ${stock} in stock`
                      : s.name
                }
                aria-label={
                  out
                    ? `Size ${s.name}, Sold Out`
                    : `Size ${s.name}${inSelection ? `, ${stock} in stock` : ""}`
                }
                onClick={() => onSize(s.id)}
                className={cn(
                  "border py-2.5 text-xs uppercase tracking-wider transition-all duration-200 relative",
                  on
                    ? "border-ink bg-ink text-paper font-semibold shadow-xs"
                    : out
                      ? "cursor-not-allowed border-stone-200 text-stone-300 line-through bg-stone-50/70 opacity-60"
                      : "border-stone-200 text-stone-800 hover:border-stone-400 bg-paper"
                )}
              >
                {s.name}
              </button>
            );
          })}
        </div>
        {selectedColorId === null && (
          <p className="mt-2 text-[11px] text-stone-400">
            Please choose a color swatch to verify size availability.
          </p>
        )}
      </div>

      {/* Stock warning indicators */}
      {lowStock && (
        <p className="text-[11px] uppercase tracking-widest text-accent font-mono animate-fade-in">
          Limited Atelier Batch: Only {currentVariant!.stock} units remaining
        </p>
      )}
      {isOutOfStock && (
        <p className="text-[11px] uppercase tracking-widest text-stone-400 font-mono">
          This size and shade combination has sold out.
        </p>
      )}
    </div>
  );
}
