import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { createAdminCollection, deleteAdminCollection, listAdminCollections, listAllProducts, updateAdminCollection } from "@/api/admin";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Checkbox } from "@/components/ui/fields";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/misc";
import { formatMoney } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/errors";
import type { Collection } from "@/types/api";

export function AdminCollections() {
  const queryClient = useQueryClient();
  const { data: collections } = useQuery({ queryKey: ["admin", "collections"], queryFn: listAdminCollections });
  const { data: products } = useQuery({ queryKey: ["products", "all"], queryFn: listAllProducts });

  const [editing, setEditing] = useState<Collection | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setTagline("");
    setDescription("");
    setSelected([]);
    setCreating(true);
  };

  const openEdit = (c: Collection) => {
    setCreating(false);
    setEditing(c);
    setName(c.name);
    setTagline(c.tagline);
    setDescription(c.description);
    setSelected(c.product_ids);
  };

  const close = () => {
    setCreating(false);
    setEditing(null);
    setError(null);
  };

  const save = useMutation({
    mutationFn: () =>
      editing
        ? updateAdminCollection(editing.id, { name, tagline, description, product_ids: selected })
        : createAdminCollection({ name, tagline, description, product_ids: selected }),
    onSuccess: () => {
      close();
      queryClient.invalidateQueries({ queryKey: ["admin", "collections"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteAdminCollection(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "collections"] }),
  });

  const toggleProduct = (id: number) =>
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Collections</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} strokeWidth={1.5} /> New collection
        </Button>
      </header>

      {!collections || collections.length === 0 ? (
        <p className="py-16 text-center text-sm text-stone-400">No collections yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {collections.map((c) => (
            <article key={c.id} className="border border-stone-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-xl">{c.name}</h2>
                  <p className="mt-1 text-xs uppercase tracking-widest text-stone-400">
                    {c.product_ids.length} product{c.product_ids.length === 1 ? "" : "s"}
                  </p>
                </div>
                <button onClick={() => remove.mutate(c.id)} aria-label="Delete collection" className="text-stone-400 hover:text-accent">
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-stone-600">{c.tagline}</p>
              <button onClick={() => openEdit(c)} className="mt-4 text-xs uppercase tracking-widest text-stone-500 hover:text-ink">
                Edit →
              </button>
            </article>
          ))}
        </div>
      )}

      <Modal open={creating || editing !== null} onClose={close} title={editing ? `Edit — ${editing.name}` : "New collection"} size="lg">
        <div className="space-y-5">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Autumn Capsule 01" />
          </Field>
          <Field label="Tagline" optional>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </Field>
          <Field label="Description" optional>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-stone-500">Products</p>
            {!products || products.length === 0 ? (
              <p className="text-sm text-stone-400">No products to add.</p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto border border-stone-200 p-3">
                {products.map((p) => (
                  <Checkbox
                    key={p.id}
                    label={`${p.name} — ${formatMoney(p.price_effective)}`}
                    checked={selected.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                    className="rounded px-2 py-1.5 hover:bg-stone-50"
                  />
                ))}
              </div>
            )}
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} loading={save.isPending}>
              {editing ? "Save changes" : "Create collection"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}