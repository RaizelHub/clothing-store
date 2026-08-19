import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { createAdminCoupon, deleteAdminCoupon, listAdminCoupons, updateAdminCoupon } from "@/api/admin";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select } from "@/components/ui/fields";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/errors";
import type { Coupon } from "@/types/api";

interface Draft {
  code: string;
  type: "percent" | "fixed";
  value: string;
  min: string;
  max_uses: string;
  expires_at: string;
  is_active: boolean;
}

const emptyDraft: Draft = { code: "", type: "percent", value: "10", min: "0", max_uses: "", expires_at: "", is_active: true };

const discountLabel = (c: Coupon) => (c.type === "percent" ? `${c.value}% off` : `${formatMoney(String(c.value))} off`);
const expiryLabel = (c: Coupon) => (c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never");

export function AdminDiscounts() {
  const queryClient = useQueryClient();
  const { data: coupons } = useQuery({ queryKey: ["admin", "coupons"], queryFn: listAdminCoupons });

  const [editing, setEditing] = useState<Coupon | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setCreating(true);
  };
  const openEdit = (c: Coupon) => {
    setCreating(false);
    setEditing(c);
    setDraft({
      code: c.code,
      type: c.type,
      value: String(c.value),
      min: c.min_order_value,
      max_uses: c.max_uses === null ? "" : String(c.max_uses),
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
      is_active: c.is_active,
    });
  };
  const close = () => {
    setCreating(false);
    setEditing(null);
    setError(null);
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        code: draft.code,
        type: draft.type,
        value: Math.max(0, Number(draft.value) || 0),
        min_order_value: Math.max(0, Number(draft.min) || 0),
        max_uses: draft.max_uses === "" ? null : Math.max(0, Number(draft.max_uses) || 0),
        expires_at: draft.expires_at ? `${draft.expires_at}T23:59:59Z` : null,
        is_active: draft.is_active,
      };
      return editing ? updateAdminCoupon(editing.id, payload) : createAdminCoupon(payload);
    },
    onSuccess: () => {
      close();
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const toggleActive = useMutation({
    mutationFn: (c: Coupon) => updateAdminCoupon(c.id, { is_active: !c.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteAdminCoupon(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] }),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Discounts</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} strokeWidth={1.5} /> New coupon
        </Button>
      </header>

      {!coupons || coupons.length === 0 ? (
        <p className="py-16 text-center text-sm text-stone-400">No coupons yet.</p>
      ) : (
        <div className="overflow-x-auto border border-stone-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-widest text-stone-500">
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Discount</th>
                <th className="px-5 py-3">Minimum</th>
                <th className="px-5 py-3">Usage</th>
                <th className="px-5 py-3">Expires</th>
                <th className="px-5 py-3">Active</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className={cn("border-b border-stone-100 last:border-0", !c.is_active && "opacity-50")}>
                  <td className="px-5 py-3 font-mono text-xs font-medium">{c.code}</td>
                  <td className="px-5 py-3">{discountLabel(c)}</td>
                  <td className="px-5 py-3">{Number(c.min_order_value) > 0 ? formatMoney(c.min_order_value) : "—"}</td>
                  <td className="px-5 py-3">
                    {c.uses}
                    {c.max_uses !== null && ` / ${c.max_uses}`}
                  </td>
                  <td className="px-5 py-3 text-stone-500">{expiryLabel(c)}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => toggleActive.mutate(c)} aria-label="Toggle active" className={cn("text-xs uppercase tracking-widest", c.is_active ? "text-ink underline underline-offset-2" : "text-stone-400 underline underline-offset-2")}>
                      {c.is_active ? "Yes" : "No"}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(c)} className="text-xs uppercase tracking-widest text-stone-500 hover:text-ink">
                        Edit
                      </button>
                      <button onClick={() => remove.mutate(c.id)} aria-label="Delete coupon" className="text-stone-300 hover:text-accent">
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={creating || editing !== null} onClose={close} title={editing ? `Edit — ${editing.code}` : "New coupon"} size="md">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code">
              <Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/\s/g, "") })} placeholder="FALL25" />
            </Field>
            <Field label="Type">
              <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Draft["type"] })}>
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed amount</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label={draft.type === "percent" ? "Value (%)" : "Value (currency)"}>
              <Input type="number" min="0" step="0.01" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
            </Field>
            <Field label="Minimum order">
              <Input type="number" min="0" step="0.01" value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Max uses" optional>
              <Input type="number" min="0" value={draft.max_uses} onChange={(e) => setDraft({ ...draft, max_uses: e.target.value })} placeholder="Unlimited" />
            </Field>
            <Field label="Expires" optional>
              <Input type="date" value={draft.expires_at} onChange={(e) => setDraft({ ...draft, expires_at: e.target.value })} />
            </Field>
          </div>
          <Checkbox label="Active" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} loading={save.isPending}>
              {editing ? "Save changes" : "Create coupon"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}