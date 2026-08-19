import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

const ROWS_INCHES = [
  { size: "XS", chest: "34–35", waist: "28–29", hips: "35–36", length: "27" },
  { size: "S", chest: "36–37", waist: "30–31", hips: "37–38", length: "28" },
  { size: "M", chest: "38–40", waist: "32–33", hips: "39–41", length: "29" },
  { size: "L", chest: "41–43", waist: "34–36", hips: "42–44", length: "30" },
  { size: "XL", chest: "44–46", waist: "37–39", hips: "45–47", length: "31" },
];

const ROWS_CM = [
  { size: "XS", chest: "86–89", waist: "71–74", hips: "89–92", length: "68" },
  { size: "S", chest: "91–94", waist: "76–79", hips: "94–97", length: "71" },
  { size: "M", chest: "96–102", waist: "81–84", hips: "99–104", length: "74" },
  { size: "L", chest: "104–109", waist: "86–91", hips: "107–112", length: "76" },
  { size: "XL", chest: "112–117", waist: "94–99", hips: "114–119", length: "79" },
];

export function SizeGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [unit, setUnit] = useState<"in" | "cm">("in");
  const rows = unit === "in" ? ROWS_INCHES : ROWS_CM;

  return (
    <Modal open={open} onClose={onClose} title="Atelier Size Guide" size="md">
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <p className="text-xs text-stone-500 leading-relaxed max-w-sm">
            All garments are cut to standard European tailoring proportions. If between sizes, we recommend sizing up for layering ease.
          </p>
          <div className="flex rounded border border-stone-200 p-0.5 font-mono text-[10.5px]">
            <button
              type="button"
              onClick={() => setUnit("in")}
              className={cn(
                "px-2.5 py-1 uppercase tracking-wider transition-colors",
                unit === "in" ? "bg-ink text-paper" : "text-stone-500 hover:text-ink"
              )}
            >
              Inches
            </button>
            <button
              type="button"
              onClick={() => setUnit("cm")}
              className={cn(
                "px-2.5 py-1 uppercase tracking-wider transition-colors",
                unit === "cm" ? "bg-ink text-paper" : "text-stone-500 hover:text-ink"
              )}
            >
              CM
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-stone-200 text-left uppercase tracking-widest text-stone-500">
                <th className="pb-2.5 font-sans font-medium">Size</th>
                <th className="pb-2.5">Chest</th>
                <th className="pb-2.5">Waist</th>
                <th className="pb-2.5">Hips</th>
                <th className="pb-2.5">Length</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((r) => (
                <tr key={r.size} className="hover:bg-stone-50/50">
                  <td className="py-2.5 font-sans font-medium text-ink">{r.size}</td>
                  <td className="py-2.5 text-stone-600">{r.chest}</td>
                  <td className="py-2.5 text-stone-600">{r.waist}</td>
                  <td className="py-2.5 text-stone-600">{r.hips}</td>
                  <td className="py-2.5 text-stone-600">{r.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded bg-stone-50 p-4 border border-stone-200/80 space-y-1 text-xs text-stone-600">
          <span className="font-mono text-[10px] uppercase tracking-wider text-stone-500 block">
            How to Measure
          </span>
          <p className="leading-relaxed">
            Measure around the fullest part of your chest with a soft measuring tape held horizontal. Keep tape comfortable without pulling tight.
          </p>
        </div>
      </div>
    </Modal>
  );
}