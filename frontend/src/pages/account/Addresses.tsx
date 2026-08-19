import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Check } from "lucide-react";
import { createAddress, deleteAddress, getAddresses, updateAddress } from "@/api/auth";
import { addressSchema, type AddressInput } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Checkbox } from "@/components/ui/fields";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Notice } from "@/components/ui/misc";
import { getApiErrorMessage } from "@/lib/errors";
import type { Address } from "@/types/api";

export function AddressesPage() {
  const queryClient = useQueryClient();
  const { data: addresses, isLoading } = useQuery({ queryKey: ["addresses"], queryFn: getAddresses });
  const [editing, setEditing] = useState<Address | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: { is_default: false },
  });

  const modalOpen = creating || editing !== null;

  const openCreate = () => {
    form.reset({ is_default: (addresses?.length ?? 0) === 0 });
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (a: Address) => {
    form.reset(a);
    setCreating(false);
    setEditing(a);
  };

  const close = () => {
    setCreating(false);
    setEditing(null);
    setError(null);
  };

  const save = useMutation({
    mutationFn: (v: AddressInput) => (editing ? updateAddress(editing.id, v) : createAddress(v)),
    onSuccess: () => {
      close();
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteAddress(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
  });

  const makeDefault = useMutation({
    mutationFn: (a: Address) => updateAddress(a.id, { is_default: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Addresses</h2>
        <Button size="sm" variant="outline" onClick={openCreate}>
          <Plus size={14} strokeWidth={1.5} /> Add address
        </Button>
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-stone-400">Loading…</p>
      ) : !addresses || addresses.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No saved addresses"
            body="Addresses are used to pre-fill checkout."
            action={
              <Button size="sm" variant="outline" onClick={openCreate}>
                <Plus size={14} strokeWidth={1.5} /> Add address
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="border border-stone-200 p-5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    {a.label}
                    {a.is_default && (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-stone-400">
                        <Check size={11} strokeWidth={2} /> Default
                      </span>
                    )}
                  </p>
                  <p className="mt-2 text-stone-600">{a.recipient}</p>
                  <p className="text-stone-600">{a.line1}</p>
                  {a.line2 && <p className="text-stone-600">{a.line2}</p>}
                  <p className="text-stone-600">
                    {a.city}
                    {a.state && `, ${a.state}`} {a.postal_code}
                  </p>
                  <p className="text-stone-600">{a.country}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-4 text-xs uppercase tracking-widest">
                {!a.is_default && (
                  <button className="text-stone-500 hover:text-ink" onClick={() => makeDefault.mutate(a)}>
                    Set default
                  </button>
                )}
                <button className="text-stone-500 hover:text-ink" onClick={() => openEdit(a)}>
                  Edit
                </button>
                <button
                  className="text-stone-500 transition-colors hover:text-accent"
                  onClick={() => remove.mutate(a.id)}
                  disabled={remove.isPending}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={modalOpen} onClose={close} title={editing ? "Edit address" : "Add address"}>
        <form
          onSubmit={form.handleSubmit((v) => save.mutate(v))}
          className="space-y-5"
          noValidate
        >
          <div className="grid grid-cols-3 gap-4">
            <Field label="Label" error={form.formState.errors.label?.message}>
              <Input placeholder="Home" invalid={!!form.formState.errors.label} {...form.register("label")} />
            </Field>
            <div className="col-span-2">
              <Field label="Recipient" error={form.formState.errors.recipient?.message}>
                <Input invalid={!!form.formState.errors.recipient} {...form.register("recipient")} />
              </Field>
            </div>
          </div>
          <Field label="Address line 1" error={form.formState.errors.line1?.message}>
            <Input invalid={!!form.formState.errors.line1} {...form.register("line1")} />
          </Field>
          <Field label="Address line 2" error={form.formState.errors.line2?.message} optional>
            <Input invalid={!!form.formState.errors.line2} {...form.register("line2")} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City" error={form.formState.errors.city?.message}>
              <Input invalid={!!form.formState.errors.city} {...form.register("city")} />
            </Field>
            <Field label="State / region" error={form.formState.errors.state?.message} optional>
              <Input invalid={!!form.formState.errors.state} {...form.register("state")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Postal code" error={form.formState.errors.postal_code?.message}>
              <Input invalid={!!form.formState.errors.postal_code} {...form.register("postal_code")} />
            </Field>
            <Field label="Country" error={form.formState.errors.country?.message}>
              <Input invalid={!!form.formState.errors.country} {...form.register("country")} />
            </Field>
          </div>
          <Field label="Phone" error={form.formState.errors.phone?.message}>
            <Input invalid={!!form.formState.errors.phone} {...form.register("phone")} />
          </Field>
          <Checkbox label="Use as default address" {...form.register("is_default")} />
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? "Save changes" : "Add address"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}