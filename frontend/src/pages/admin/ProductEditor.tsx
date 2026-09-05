import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { createAdminProduct, getAdminProduct, updateAdminProduct, type ProductInput } from "@/api/admin";
import { getCategories, getColors, getSizes } from "@/api/products";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select, Checkbox } from "@/components/ui/fields";
import { Notice, Skeleton } from "@/components/ui/misc";
import { formatMoney } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/errors";

interface Row {
  key: string;
  color_id: number;
  size_id: number;
  sku: string;
  price_override_cents: number | null;
  stock: number;
}

interface ImageRow {
  key: string;
  image: string;
  alt: string;
  color_id: number | null;
}

let rowKey = 0;
const newRowKey = () => `row-${++rowKey}`;

const colorCode = (name: string) => name.slice(0, 3).toUpperCase();

export function ProductEditor() {
  const { id } = useParams();
  const editing = id !== undefined;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["admin", "products", Number(id)],
    queryFn: () => getAdminProduct(Number(id)),
    enabled: editing,
  });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const { data: colors } = useQuery({ queryKey: ["lookups", "colors"], queryFn: getColors });
  const { data: sizes } = useQuery({ queryKey: ["lookups", "sizes"], queryFn: getSizes });

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [care, setCare] = useState("");
  const [fit, setFit] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [categoryId, setCategoryId] = useState(1);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNewFlag, setIsNewFlag] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageAlt, setNewImageAlt] = useState("");
  const [newImageColor, setNewImageColor] = useState<number | "">("");
  const [pendingColor, setPendingColor] = useState(1);
  const [pendingSize, setPendingSize] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setTagline(existing.tagline);
    setDescription(existing.description);
    setCare(existing.care);
    setFit(existing.fit);
    setBasePrice(existing.base_price);
    setSalePrice(existing.sale_price ?? "");
    setCategoryId(existing.category);
    setIsFeatured(existing.is_featured);
    setIsNewFlag(existing.is_new);
    setRows(
      existing.variants.map((v) => ({
        key: newRowKey(),
        color_id: v.color.id,
        size_id: v.size.id,
        sku: v.sku,
        price_override_cents: v.price !== null ? Math.round(parseFloat(v.price) * 100) : null,
        stock: v.stock,
      }))
    );
    if (existing.images && existing.images.length > 0) {
      setImages(
        existing.images.map((img, idx) => ({
          key: `img-${img.id || idx}-${idx}`,
          image: img.image,
          alt: img.alt || "",
          color_id: img.color ? (typeof img.color === "object" ? (img.color as { id: number }).id : Number(img.color)) : null,
        }))
      );
    }
  }, [existing]);

  const addImage = () => {
    if (!newImageUrl.trim()) return;
    setImages([
      ...images,
      {
        key: `img-new-${Date.now()}`,
        image: newImageUrl.trim(),
        alt: newImageAlt.trim(),
        color_id: newImageColor === "" ? null : Number(newImageColor),
      },
    ]);
    setNewImageUrl("");
    setNewImageAlt("");
    setNewImageColor("");
  };

  const removeImage = (key: string) => setImages(images.filter((img) => img.key !== key));

  const updateImage = (key: string, patch: Partial<ImageRow>) =>
    setImages(images.map((img) => (img.key === key ? { ...img, ...patch } : img)));

  const addRow = () => {
    if (!colors || !sizes) return;
    const color = colors.find((c) => c.id === pendingColor)!;
    const size = sizes.find((s) => s.id === pendingSize)!;
    if (rows.some((r) => r.color_id === pendingColor && r.size_id === pendingSize)) return;
    const autoSku = `STU-${colorCode(color.name)}-${size.name[0]}`;
    let sku = autoSku;
    let n = 2;
    while (rows.some((r) => r.sku === sku)) sku = `${autoSku}${n++}`;
    setRows([...rows, { key: newRowKey(), color_id: pendingColor, size_id: pendingSize, sku, price_override_cents: null, stock: 10 }]);
  };

  const removeRow = (key: string) => setRows(rows.filter((r) => r.key !== key));

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const usedColors = useMemo(() => {
    const ids = Array.from(new Set(rows.map((r) => r.color_id)));
    return (colors ?? []).filter((c) => ids.includes(c.id));
  }, [rows, colors]);

  const payload = (): ProductInput => ({
    name,
    tagline,
    description,
    care,
    fit,
    base_price: basePrice || "0",
    sale_price: salePrice ? salePrice : null,
    category_id: categoryId,
    is_featured: isFeatured,
    is_new: isNewFlag,
    variants: rows.map((r) => ({
      sku: r.sku,
      color_id: r.color_id,
      size_id: r.size_id,
      price_override_cents: r.price_override_cents,
      stock: r.stock,
    })),
    colors: usedColors.map((c) => ({ color_id: c.id, hex: c.hex })),
    images: images.map((img) => ({
      image: img.image.trim(),
      alt: img.alt.trim(),
      color_id: img.color_id || null,
    })),
  });

  const save = useMutation({
    mutationFn: () => (editing ? updateAdminProduct(Number(id), payload()) : createAdminProduct(payload())),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      navigate(`/admin/products/${product.id}/edit`);
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  if (loadingExisting) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <Link to="/admin/products" className="text-xs uppercase tracking-widest text-stone-500 hover:text-ink">
            ← Products
          </Link>
          <h1 className="mt-2 font-display text-3xl">{editing ? `Edit — ${existing?.name ?? ""}` : "New product"}</h1>
        </div>
        <Button onClick={() => save.mutate()} loading={save.isPending}>
          {editing ? "Save changes" : "Create product"}
        </Button>
      </header>

      <section className="space-y-5 border border-stone-200 p-6">
        <h2 className="text-xs uppercase tracking-widest text-stone-500">Details</h2>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Essential Oversized Tee" />
        </Field>
        <Field label="Tagline" optional>
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One line for product cards" />
        </Field>
        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Fit" optional>
            <Input value={fit} onChange={(e) => setFit(e.target.value)} />
          </Field>
          <Field label="Care" optional>
            <Input value={care} onChange={(e) => setCare(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category">
            <Select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
              {categories?.map((c) => (
                <optgroup key={c.id} label={c.name}>
                  {(c.children ?? []).map((child) => (
                    <option key={child.id} value={child.id}>
                      {c.name} — {child.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Base price (PHP / ₱)">
            <Input type="number" step="0.01" min="0" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
          </Field>
          <Field label="Sale price (PHP / ₱, blank = no sale)" optional>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="e.g. 69.00"
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-6">
          <Checkbox label="Featured on homepage" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
          <Checkbox label="Flag as new arrival" checked={isNewFlag} onChange={(e) => setIsNewFlag(e.target.checked)} />
        </div>
      </section>

      {/* Product Images Section */}
      <section className="space-y-5 border border-stone-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-stone-500">
              <ImageIcon size={14} /> Product Images & Media
            </h2>
            <p className="mt-0.5 text-xs text-stone-400">
              Add image URLs for this product (Unsplash, CDN, or local media). Associate images with colors to change photos on color selection.
            </p>
          </div>
          <span className="text-xs font-mono text-stone-500">
            {images.length} {images.length === 1 ? "image" : "images"}
          </span>
        </div>

        {/* Add new image row */}
        <div className="border border-stone-200/80 bg-stone-50/50 p-4 space-y-3">
          <div className="text-xs font-medium uppercase tracking-wider text-stone-600">Add New Image</div>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_160px_auto] items-end">
            <Field label="Image URL">
              <Input
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... or /media/..."
              />
            </Field>
            <Field label="Alt description" optional>
              <Input
                value={newImageAlt}
                onChange={(e) => setNewImageAlt(e.target.value)}
                placeholder="e.g. Front view"
              />
            </Field>
            <Field label="Color link" optional>
              <Select
                value={newImageColor}
                onChange={(e) => setNewImageColor(e.target.value === "" ? "" : Number(e.target.value))}
              >
                <option value="">All colors (General)</option>
                {colors?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Button size="sm" type="button" onClick={addImage} disabled={!newImageUrl.trim()}>
              <Plus size={14} strokeWidth={1.5} /> Add image
            </Button>
          </div>
        </div>

        {/* List of images */}
        {images.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400 border border-dashed border-stone-200">
            No custom images added yet. (SVG placeholders are used automatically if left empty).
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {images.map((img, idx) => (
              <div key={img.key} className="flex gap-3 border border-stone-200 bg-paper p-3">
                <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-stone-100 border border-stone-200">
                  <img
                    src={img.image}
                    alt={img.alt || "Product preview"}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.opacity = "0.2";
                    }}
                  />
                  {idx === 0 && (
                    <span className="absolute bottom-0 inset-x-0 bg-ink text-paper text-[8px] text-center font-mono uppercase tracking-wider py-0.5">
                      Cover
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <Field label="Image URL">
                    <Input
                      value={img.image}
                      onChange={(e) => updateImage(img.key, { image: e.target.value })}
                      className="!px-2 !py-1 text-xs font-mono"
                      placeholder="Image URL"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Alt">
                      <Input
                        value={img.alt}
                        onChange={(e) => updateImage(img.key, { alt: e.target.value })}
                        className="!px-2 !py-1 text-xs"
                        placeholder="Alt description"
                      />
                    </Field>
                    <Field label="Color">
                      <Select
                        value={img.color_id ?? ""}
                        onChange={(e) =>
                          updateImage(img.key, {
                            color_id: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        className="!px-2 !py-1 text-xs"
                      >
                        <option value="">All colors</option>
                        {colors?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(img.key)}
                  className="self-start text-stone-400 hover:text-accent p-1 transition-colors"
                  aria-label="Remove image"
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border border-stone-200 p-6">
        <h2 className="text-xs uppercase tracking-widest text-stone-500">Variants</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="Colour">
            <Select value={pendingColor} onChange={(e) => setPendingColor(Number(e.target.value))}>
              {colors?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Size">
            <Select value={pendingSize} onChange={(e) => setPendingSize(Number(e.target.value))}>
              {sizes?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button size="sm" variant="outline" onClick={addRow} type="button">
            <Plus size={14} strokeWidth={1.5} /> Add variant
          </Button>
        </div>

        {rows.length === 0 ? (
          <p className="mt-6 text-sm text-stone-400">Add at least one colour × size combination.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-widest text-stone-500">
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Colour</th>
                  <th className="py-2 pr-3">Size</th>
                  <th className="py-2 pr-3">Price override</th>
                  <th className="py-2 pr-3">Stock</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const color = colors?.find((c) => c.id === r.color_id);
                  const size = sizes?.find((s) => s.id === r.size_id);
                  return (
                    <tr key={r.key} className="border-b border-stone-100">
                      <td className="py-2.5 pr-3">
                        <Input value={r.sku} onChange={(e) => updateRow(r.key, { sku: e.target.value.toUpperCase() })} className="!px-2 !py-1.5 text-xs" />
                      </td>
                      <td className="py-2.5 pr-3">{color?.name}</td>
                      <td className="py-2.5 pr-3">{size?.name}</td>
                      <td className="py-2.5 pr-3">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={basePrice ? formatMoney(basePrice) : "Fallback"}
                          value={r.price_override_cents !== null ? (r.price_override_cents / 100).toFixed(2) : ""}
                          onChange={(e) =>
                            updateRow(r.key, { price_override_cents: e.target.value === "" ? null : Math.round(parseFloat(e.target.value) * 100) })
                          }
                          className="!px-2 !py-1.5 text-xs"
                        />
                      </td>
                      <td className="py-2.5 pr-3">
                        <Input
                          type="number"
                          min="0"
                          value={r.stock}
                          onChange={(e) => updateRow(r.key, { stock: Math.max(0, Number(e.target.value) || 0) })}
                          className="!w-20 !px-2 !py-1.5 text-xs"
                        />
                      </td>
                      <td className="py-2.5">
                        <button onClick={() => removeRow(r.key)} aria-label={`Remove ${r.sku}`} className="text-stone-400 hover:text-accent">
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-stone-400">
          SKUs follow the {colorCode("Black")}‑{colorCode("Stone")} pattern from the seed: STU-{colorCode("Black")}-S etc.
        </p>
      </section>

      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}