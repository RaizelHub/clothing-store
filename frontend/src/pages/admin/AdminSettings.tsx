import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getStoreSettings, updateStoreSettings } from "@/api/admin";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/fields";
import { Notice } from "@/components/ui/misc";
import { getApiErrorMessage } from "@/lib/errors";

export function AdminSettings() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["admin", "settings"], queryFn: getStoreSettings });

  const [form, setForm] = useState<{
    store_name: string;
    tax_rate: string;
    shipping_flat_rate: string;
    free_shipping_threshold: string;
    low_stock_threshold: string;
  } | null>(null);

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayed = form ?? (settings ? {
    store_name: settings.store_name,
    tax_rate: String(settings.tax_rate * 100),
    shipping_flat_rate: settings.shipping_flat_rate,
    free_shipping_threshold: settings.free_shipping_threshold ?? "",
    low_stock_threshold: String(settings.low_stock_threshold),
  } : null);

  const save = useMutation({
    mutationFn: () =>
      updateStoreSettings({
        store_name: displayed?.store_name ?? "",
        tax_rate: (Number(displayed?.tax_rate) || 0) / 100,
        shipping_flat_rate: (Number(displayed?.shipping_flat_rate) || 0).toFixed(2),
        free_shipping_threshold: displayed?.free_shipping_threshold === "" ? null : (Number(displayed?.free_shipping_threshold) || 0).toFixed(2),
        low_stock_threshold: Math.max(0, Number(displayed?.low_stock_threshold) || 0),
      }),
    onSuccess: (s) => {
      setForm({
        store_name: s.store_name,
        tax_rate: String((s.tax_rate * 100).toFixed(2)),
        shipping_flat_rate: s.shipping_flat_rate,
        free_shipping_threshold: s.free_shipping_threshold ?? "",
        low_stock_threshold: String(s.low_stock_threshold),
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-stone-500">Store-level configuration. Changes apply immediately to checkout maths and stock alerts.</p>
      </header>

      {!displayed ? (
        <p className="py-10 text-center text-sm text-stone-400">Loading…</p>
      ) : (
        <div className="space-y-5 border border-stone-200 p-6">
          <Field label="Store name">
            <Input value={displayed.store_name} onChange={(e) => setForm({ ...displayed, store_name: e.target.value })} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tax rate (%)">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={displayed.tax_rate}
                onChange={(e) => setForm({ ...displayed, tax_rate: e.target.value })}
              />
            </Field>
            <Field label="Flat shipping (currency)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={displayed.shipping_flat_rate}
                onChange={(e) => setForm({ ...displayed, shipping_flat_rate: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Free shipping threshold" optional>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={displayed.free_shipping_threshold}
                onChange={(e) => setForm({ ...displayed, free_shipping_threshold: e.target.value })}
                placeholder="Leave empty for no free shipping"
              />
            </Field>
            <Field label="Low stock alert threshold">
              <Input
                type="number"
                min="0"
                value={displayed.low_stock_threshold}
                onChange={(e) => setForm({ ...displayed, low_stock_threshold: e.target.value })}
              />
            </Field>
          </div>

          {error && <Notice tone="error">{error}</Notice>}
          {saved && <Notice tone="success">Settings saved.</Notice>}

          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} loading={save.isPending}>
              Save settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}