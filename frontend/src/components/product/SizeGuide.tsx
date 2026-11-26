import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import {
  SIZE_CATEGORY_GUIDES,
  resolveCategoryGuide,
  type SizeCategoryKey,
  type Unit,
} from "./sizeGuideData";
import { Info, HelpCircle } from "lucide-react";

export interface SizeGuideProps {
  open: boolean;
  onClose: () => void;
  categorySlug?: string;
  categoryName?: string;
  productName?: string;
  productFit?: string;
  selectedSizeName?: string | null;
  onSelectSizeName?: (sizeName: string) => void;
}

export function SizeGuide({
  open,
  onClose,
  categorySlug,
  categoryName,
  productName,
  productFit,
  selectedSizeName,
  onSelectSizeName,
}: SizeGuideProps) {
  const [activeCategory, setActiveCategory] = useState<SizeCategoryKey>("tops");
  const [unit, setUnit] = useState<Unit>("cm");
  const [showHowToMeasure, setShowHowToMeasure] = useState(true);

  // Sync category when opened or when product category changes
  useEffect(() => {
    if (open) {
      setActiveCategory(resolveCategoryGuide(categorySlug, categoryName));
    }
  }, [open, categorySlug, categoryName]);

  const currentGuide = SIZE_CATEGORY_GUIDES[activeCategory] ?? SIZE_CATEGORY_GUIDES.tops;
  const categoriesList: { key: SizeCategoryKey; label: string }[] = [
    { key: "tops", label: "Tops & Shirts" },
    { key: "bottoms", label: "Bottoms & Denim" },
    { key: "dresses", label: "Dresses" },
    { key: "outerwear", label: "Outerwear & Coats" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Studio Sizing & Fit Guide"
      size="xl"
    >
      <div className="space-y-6">
        {/* Editorial Subheader & Category Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
          {/* Category Tabs */}
          <div
            role="tablist"
            aria-label="Size guide categories"
            className="flex flex-wrap gap-1 p-0.5 bg-stone-100/80 rounded"
          >
            {categoriesList.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  role="tab"
                  type="button"
                  id={`tab-${cat.key}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${cat.key}`}
                  onClick={() => setActiveCategory(cat.key)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-all",
                    isActive
                      ? "bg-paper text-ink font-medium shadow-xs"
                      : "text-stone-500 hover:text-ink"
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Unit Switcher */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-[11px] font-mono uppercase tracking-widest text-stone-400">
              Unit:
            </span>
            <div
              role="radiogroup"
              aria-label="Measurement units"
              className="flex rounded border border-stone-200 p-0.5 font-mono text-[11px] bg-paper"
            >
              <button
                type="button"
                role="radio"
                aria-checked={unit === "cm"}
                onClick={() => setUnit("cm")}
                className={cn(
                  "px-3 py-1 uppercase tracking-wider transition-colors",
                  unit === "cm"
                    ? "bg-ink text-paper font-medium"
                    : "text-stone-500 hover:text-ink"
                )}
              >
                CM
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={unit === "in"}
                onClick={() => setUnit("in")}
                className={cn(
                  "px-3 py-1 uppercase tracking-wider transition-colors",
                  unit === "in"
                    ? "bg-ink text-paper font-medium"
                    : "text-stone-500 hover:text-ink"
                )}
              >
                Inches
              </button>
            </div>
          </div>
        </div>

        {/* Product Specific Fit Guidance */}
        {productFit && (
          <div className="rounded bg-stone-50/90 border border-stone-200/90 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-ink">
              <Info size={14} strokeWidth={1.5} className="text-stone-500 shrink-0" />
              <span className="uppercase tracking-wider font-mono text-[10.5px] text-stone-500">
                Fit & Silhouette for {productName ?? "this piece"}
              </span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed pl-5.5">
              {productFit}
            </p>
          </div>
        )}

        {/* Measurement Table */}
        <div
          id={`panel-${activeCategory}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeCategory}`}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500">
              {currentGuide.description}{" "}
              <span className="font-mono text-[10.5px] text-stone-400">
                (All values in {unit === "cm" ? "centimeters" : "inches"})
              </span>
            </p>
            {selectedSizeName && (
              <span className="text-[11px] font-mono text-ink bg-stone-100 px-2 py-0.5 rounded">
                Active Selection: Size {selectedSizeName}
              </span>
            )}
          </div>

          <div className="overflow-x-auto border border-stone-200 rounded">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-left uppercase tracking-wider text-stone-500 text-[10.5px]">
                  <th className="py-3 px-3 font-sans font-medium text-ink">Size</th>
                  <th className="py-3 px-3">US</th>
                  <th className="py-3 px-3">EU</th>
                  <th className="py-3 px-3">UK</th>
                  {currentGuide.columns.map((col) => (
                    <th key={col.key} className="py-3 px-3 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-paper">
                {currentGuide.rows.map((r) => {
                  const isSelected = selectedSizeName === r.size;
                  return (
                    <tr
                      key={r.size}
                      onClick={() => onSelectSizeName?.(r.size)}
                      className={cn(
                        "transition-colors",
                        onSelectSizeName && "cursor-pointer hover:bg-stone-50/70",
                        isSelected
                          ? "bg-stone-100/90 font-medium text-ink border-l-3 border-ink"
                          : "text-stone-700"
                      )}
                    >
                      <td className="py-3 px-3 font-sans font-medium text-ink whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{r.size}</span>
                          {isSelected && (
                            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 bg-ink text-paper rounded-xs font-mono">
                              Selected
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-stone-500 whitespace-nowrap">{r.intl.us}</td>
                      <td className="py-3 px-3 text-stone-500 whitespace-nowrap">{r.intl.eu}</td>
                      <td className="py-3 px-3 text-stone-500 whitespace-nowrap">{r.intl.uk}</td>
                      {currentGuide.columns.map((col) => (
                        <td key={col.key} className="py-3 px-3 whitespace-nowrap">
                          {unit === "cm" ? r.cm[col.key] ?? "—" : r.in[col.key] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* How to Measure Guide */}
        <div className="border border-stone-200/80 rounded bg-stone-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider font-mono text-stone-700">
              <HelpCircle size={14} strokeWidth={1.5} className="text-stone-500" />
              <span>How to Measure ({currentGuide.label})</span>
            </div>
            <button
              type="button"
              onClick={() => setShowHowToMeasure((v) => !v)}
              className="text-[11px] font-mono text-stone-500 hover:text-ink underline underline-offset-2"
            >
              {showHowToMeasure ? "Hide Guide" : "Show Guide"}
            </button>
          </div>

          {showHowToMeasure && (
            <div className="grid gap-3 pt-1 text-xs text-stone-600 sm:grid-cols-2">
              {currentGuide.measureTips.map((tip) => (
                <div key={tip.title} className="space-y-0.5">
                  <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink font-medium block">
                    {tip.title}
                  </span>
                  <p className="text-[11.5px] leading-relaxed text-stone-600">
                    {tip.instruction}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tailoring Reference Note */}
        <p className="text-[11px] text-stone-400 font-mono leading-relaxed border-t border-stone-200 pt-3">
          Garment measurements represent Studio standard tailoring reference parameters. Each garment is cut to express its distinct silhouette and drape. For between-size inquiries, we advise consulting our garment Fit Note above or reaching out to atelier client concierge.
        </p>
      </div>
    </Modal>
  );
}
