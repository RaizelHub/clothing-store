import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { getAdminLook, createAdminLook, updateAdminLook } from "@/api/looks";
import { listAllProducts } from "@/api/admin";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/fields";
import { Notice, Skeleton } from "@/components/ui/misc";
import { formatMoney } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/errors";
import type {
  AdminOutfitInput,
  AdminOutfitItemInput,
  BundleDiscountType,
  OutfitStatus,
} from "@/types/api";

interface LocalOutfitItem {
  product_id: number;
  product_name: string;
  product_price: string;
  product_image: string | null;
  position: number;
  styling_note: string;
  is_featured_item: boolean;
}

export function OutfitEditor() {
  const { id } = useParams();
  const editing = id !== undefined;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["admin", "looks", Number(id)],
    queryFn: () => getAdminLook(Number(id)),
    enabled: editing,
  });

  const { data: catalogProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ["products", "all"],
    queryFn: listAllProducts,
  });

  const hydratedIdRef = useRef<number | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<OutfitStatus>("draft");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isFeatured, setIsFeatured] = useState<boolean>(false);

  // Editorial Imagery
  const [coverImage, setCoverImage] = useState("");
  const [coverImageAlt, setCoverImageAlt] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [galleryUrls, setGalleryUrls] = useState("");

  // Bundle Discount
  const [bundleType, setBundleType] = useState<BundleDiscountType>("percent");
  const [bundleValue, setBundleValue] = useState<string>("15");
  const [bundleMinItems, setBundleMinItems] = useState<number>(2);

  // Items
  const [items, setItems] = useState<LocalOutfitItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");

  // UI States
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Auto-slug generator
  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // Hydrate fields once on edit
  useEffect(() => {
    if (!existing) return;
    if (hydratedIdRef.current === existing.id) return;
    hydratedIdRef.current = existing.id;

    setName(existing.name);
    setSlug(existing.slug);
    setDescription(existing.description || "");
    setStatus(existing.status);
    setSortOrder(existing.sort_order ?? 0);
    setIsFeatured(existing.is_featured ?? false);

    setCoverImage(existing.cover_image || "");
    setCoverImageAlt(existing.cover_image_alt || "");
    setHeroImage(existing.hero_image || "");

    const galleryText = (existing.gallery_images || [])
      .map((g) => g.url)
      .filter(Boolean)
      .join("\n");
    setGalleryUrls(galleryText);

    setBundleType(existing.bundle_discount_type);
    setBundleValue(existing.bundle_discount_value || "0");
    setBundleMinItems(existing.bundle_min_items ?? 2);

    const mappedItems: LocalOutfitItem[] = (existing.items || []).map((it) => ({
      product_id: it.product.id,
      product_name: it.product.name,
      product_price: it.product.base_price,
      product_image:
        it.product.images?.[0]?.image ||
        it.product.images?.[0]?.urls?.card ||
        null,
      position: it.position,
      styling_note: it.styling_note || "",
      is_featured_item: it.is_featured_item ?? false,
    }));
    mappedItems.sort((a, b) => a.position - b.position);
    setItems(mappedItems);
  }, [existing]);

  // Handle adding product to outfit
  const handleAddProduct = () => {
    if (!selectedProductId) return;
    const prod = catalogProducts?.find((p) => p.id === Number(selectedProductId));
    if (!prod) return;

    if (items.some((it) => it.product_id === prod.id)) {
      setError(`"${prod.name}" is already in this outfit.`);
      return;
    }

    const nextPosition = items.length > 0 ? Math.max(...items.map((i) => i.position)) + 1 : 1;
    const newItem: LocalOutfitItem = {
      product_id: prod.id,
      product_name: prod.name,
      product_price: prod.sale_price || prod.base_price,
      product_image:
        prod.images && prod.images.length > 0
          ? typeof prod.images[0] === "string"
            ? prod.images[0]
            : (prod.images[0] as any).image || (prod.images[0] as any).url || null
          : null,
      position: nextPosition,
      styling_note: "",
      is_featured_item: items.length === 0, // default first to featured
    };

    setItems([...items, newItem]);
    setSelectedProductId("");
    setError(null);
  };

  const handleRemoveItem = (productId: number) => {
    const updated = items
      .filter((it) => it.product_id !== productId)
      .map((it, idx) => ({ ...it, position: idx + 1 }));
    setItems(updated);
  };

  const handleMoveItem = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === items.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Renumber positions
    const renumbered = newItems.map((it, idx) => ({
      ...it,
      position: idx + 1,
    }));
    setItems(renumbered);
  };

  const handleUpdateStylingNote = (productId: number, note: string) => {
    setItems((prev) =>
      prev.map((it) => (it.product_id === productId ? { ...it, styling_note: note } : it))
    );
  };

  const handleToggleFeaturedItem = (productId: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.product_id === productId ? { ...it, is_featured_item: !it.is_featured_item } : it
      )
    );
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      setSavedNotice(null);

      if (!name.trim()) {
        throw new Error("Outfit name is required.");
      }

      const generatedSlug = slug.trim() ? slugify(slug) : slugify(name);
      if (!generatedSlug) {
        throw new Error("A valid slug is required.");
      }

      // Parse gallery URLs
      const gallery = galleryUrls
        .split("\n")
        .map((u) => u.trim())
        .filter((u) => u.length > 0)
        .map((url) => ({ url }));

      const outfitItems: AdminOutfitItemInput[] = items.map((it, idx) => ({
        product_id: it.product_id,
        position: idx + 1,
        styling_note: it.styling_note.trim(),
        is_featured_item: it.is_featured_item,
      }));

      const payload: AdminOutfitInput = {
        name: name.trim(),
        slug: generatedSlug,
        description: description.trim(),
        status,
        sort_order: Number(sortOrder) || 0,
        is_featured: isFeatured,
        cover_image: coverImage.trim(),
        cover_image_alt: coverImageAlt.trim(),
        hero_image: heroImage.trim(),
        gallery_images: gallery,
        bundle_discount_type: bundleType,
        bundle_discount_value: bundleValue,
        bundle_min_items: Number(bundleMinItems) || 2,
        items: outfitItems,
      };

      if (editing) {
        return await updateAdminLook(Number(id), payload);
      } else {
        return await createAdminLook(payload);
      }
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "looks"] });
      queryClient.invalidateQueries({ queryKey: ["looks"] });
      setSavedNotice(`Look "${saved.name}" successfully saved.`);
      if (!editing) {
        navigate(`/admin/looks/${saved.id}/edit`, { replace: true });
      }
    },
    onError: (err: any) => {
      setError(getApiErrorMessage(err));
    },
  });

  if (editing && loadingExisting) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Calculate live sum for garments preview
  const estimatedSum = items.reduce((sum, it) => sum + parseFloat(it.product_price || "0"), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/looks"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-stone-500 hover:text-ink transition-colors"
          >
            <ArrowLeft size={14} /> Back to Looks
          </Link>
          <span className="text-stone-300">/</span>
          <span className="font-display text-xl text-ink">
            {editing ? `Edit Look: ${existing?.name || ""}` : "Create New Look"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {editing && status === "published" && (
            <Link
              to={`/looks/${slug || existing?.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-stone-600 hover:text-ink border border-stone-200 px-3 py-1.5 transition-colors"
            >
              View on Storefront <ExternalLink size={12} />
            </Link>
          )}

          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending
              ? "Saving…"
              : editing
              ? "Save Changes"
              : "Create Outfit"}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {error && <Notice tone="error">{error}</Notice>}
      {savedNotice && <Notice tone="success">{savedNotice}</Notice>}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Main Configuration */}
        <div className="space-y-8 lg:col-span-2">
          {/* Section 1: Editorial Overview */}
          <section className="space-y-5 rounded border border-stone-200 bg-paper p-6">
            <h2 className="font-display text-lg text-ink">1. Editorial Overview</h2>

            <div className="space-y-4">
              <Field label="Look Name">
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editing && !slug) {
                      setSlug(slugify(e.target.value));
                    }
                  }}
                  placeholder="e.g. Weekend Neutrals, Atelier Monochrome"
                />
              </Field>

              <Field label="URL Slug" hint="Unique identifier for storefront URL (/looks/<slug>)">
                <Input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="e.g. weekend-neutrals"
                />
              </Field>

              <Field label="Editorial Narrative / Description" hint="Styling concept, aesthetic mood, and occasion suitability">
                <Textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the mood, silhouettes, materials, and styling direction of this outfit…"
                />
              </Field>
            </div>
          </section>

          {/* Section 2: Curated Garments */}
          <section className="space-y-5 rounded border border-stone-200 bg-paper p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg text-ink">2. Curated Garments</h2>
                <p className="text-xs text-stone-500">
                  Select and order the coordinated garments comprising this outfit.
                </p>
              </div>
              <span className="text-xs font-mono text-stone-400">
                {items.length} {items.length === 1 ? "piece" : "pieces"}
              </span>
            </div>

            {/* Add Garment Selector */}
            <div className="flex flex-col gap-2 rounded border border-stone-200/80 bg-stone-50/50 p-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-600">
                  Add Catalog Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full border border-stone-300 bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                  disabled={loadingProducts}
                >
                  <option value="">-- Choose a product to add --</option>
                  {(catalogProducts || [])
                    .filter((p) => !items.some((it) => it.product_id === p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatMoney(p.sale_price || p.base_price)})
                      </option>
                    ))}
                </select>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddProduct}
                disabled={!selectedProductId}
              >
                <Plus size={14} /> Add Garment
              </Button>
            </div>

            {/* Items List */}
            {items.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400 uppercase tracking-widest border border-dashed border-stone-200">
                No garments added yet. Select a product above.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.product_id}
                    className="flex flex-col gap-4 rounded border border-stone-200 bg-stone-50/30 p-4 transition-colors hover:border-stone-300 sm:flex-row sm:items-start"
                  >
                    {/* Position & Order Controls */}
                    <div className="flex flex-row items-center gap-1 sm:flex-col sm:justify-center">
                      <button
                        type="button"
                        onClick={() => handleMoveItem(index, "up")}
                        disabled={index === 0}
                        className="rounded p-1 text-stone-400 hover:text-ink disabled:opacity-30"
                        title="Move Up"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <span className="font-mono text-xs font-medium text-stone-600 px-1">
                        #{item.position}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMoveItem(index, "down")}
                        disabled={index === items.length - 1}
                        className="rounded p-1 text-stone-400 hover:text-ink disabled:opacity-30"
                        title="Move Down"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>

                    {/* Garment Thumbnail */}
                    <div className="relative aspect-[4/5] w-16 shrink-0 bg-stone-200 overflow-hidden">
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-[10px] text-stone-400">
                          No img
                        </div>
                      )}
                    </div>

                    {/* Garment Details & Styling Note */}
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-ink truncate">
                            {item.product_name}
                          </p>
                          <p className="font-mono text-xs text-stone-500">
                            {formatMoney(item.product_price)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.product_id)}
                          className="text-stone-400 hover:text-accent transition-colors p-1"
                          title="Remove from look"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Styling Note */}
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
                          Styling Note / Wear Tip
                        </label>
                        <input
                          type="text"
                          value={item.styling_note}
                          onChange={(e) =>
                            handleUpdateStylingNote(item.product_id, e.target.value)
                          }
                          placeholder="e.g. Front-tuck loosely into trousers; pair with brown leather loafers"
                          className="mt-1 w-full border border-stone-200 bg-paper px-3 py-1.5 text-xs text-ink placeholder:text-stone-400 focus:border-ink focus:outline-none"
                        />
                      </div>

                      {/* Signature Item Checkbox */}
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-stone-600">
                        <input
                          type="checkbox"
                          checked={item.is_featured_item}
                          onChange={() => handleToggleFeaturedItem(item.product_id)}
                          className="rounded border-stone-300 text-ink focus:ring-0"
                        />
                        <span className="flex items-center gap-1">
                          <Sparkles size={11} className={item.is_featured_item ? "text-amber-500" : "text-stone-400"} />
                          Signature / Key Garment
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 3: Bundle Discount & Promotion */}
          <section className="space-y-5 rounded border border-stone-200 bg-paper p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg text-ink">3. Bundle Discount Rules</h2>
                <p className="text-xs text-stone-500">
                  Incentivize purchasing the complete look with coordinated bundle savings.
                </p>
              </div>
              {bundleType !== "none" && (
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 border border-emerald-200">
                  Bundle Active
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Discount Type">
                <Select
                  value={bundleType}
                  onChange={(e) => setBundleType(e.target.value as BundleDiscountType)}
                >
                  <option value="none">No Bundle Discount</option>
                  <option value="percent">Percentage Off (%)</option>
                  <option value="fixed">Fixed Amount Off ($ / PHP)</option>
                </Select>
              </Field>

              {bundleType !== "none" && (
                <>
                  <Field
                    label={bundleType === "percent" ? "Discount Percentage (%)" : "Fixed Discount ($)"}
                    hint={bundleType === "percent" ? "e.g. 15 for 15% off" : "e.g. 20.00 for $20 off"}
                  >
                    <Input
                      type="number"
                      step={bundleType === "percent" ? "1" : "0.01"}
                      value={bundleValue}
                      onChange={(e) => setBundleValue(e.target.value)}
                    />
                  </Field>

                  <Field
                    label="Min Items Required"
                    hint="Minimum pieces customer must select"
                  >
                    <Input
                      type="number"
                      min={1}
                      max={items.length || 10}
                      value={bundleMinItems}
                      onChange={(e) => setBundleMinItems(Number(e.target.value))}
                    />
                  </Field>
                </>
              )}
            </div>

            {/* Visual Bundle Calculation Preview */}
            <div className="rounded border border-stone-200 bg-stone-50/50 p-4">
              <p className="text-[11px] uppercase tracking-wider font-medium text-stone-500">
                Bundle Promotion Summary
              </p>
              <div className="mt-2 text-xs leading-relaxed text-stone-700">
                {bundleType === "none" && (
                  <span>
                    No automated discount is applied. Customers can still add all {items.length} garments to their bag with 1 click at full catalog prices.
                  </span>
                )}
                {bundleType === "percent" && (
                  <span>
                    When customers select at least <strong>{bundleMinItems} garments</strong> from this look, they receive an automatic <strong>{bundleValue}% bundle discount</strong> across all selected pieces.
                  </span>
                )}
                {bundleType === "fixed" && (
                  <span>
                    When customers select at least <strong>{bundleMinItems} garments</strong> from this look, they receive a fixed <strong>{formatMoney(bundleValue)} deduction</strong> off their order subtotal.
                  </span>
                )}
              </div>

              {items.length > 0 && bundleType !== "none" && (
                <div className="mt-3 flex items-center justify-between border-t border-stone-200/60 pt-2 text-xs font-mono">
                  <span className="text-stone-500">All {items.length} garments full price:</span>
                  <span className="text-stone-500">{formatMoney(estimatedSum)}</span>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right 1 Col: Publishing & Editorial Imagery */}
        <div className="space-y-8">
          {/* Section 4: Publishing Status */}
          <section className="space-y-5 rounded border border-stone-200 bg-paper p-6">
            <h2 className="font-display text-lg text-ink">Publishing</h2>

            <div className="space-y-4">
              <Field label="Status">
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as OutfitStatus)}
                >
                  <option value="draft">Draft (Staff preview only)</option>
                  <option value="published">Published (Live on storefront)</option>
                  <option value="archived">Archived (Hidden)</option>
                </Select>
              </Field>

              <Field label="Display Sort Order" hint="Lower numbers appear first">
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                />
              </Field>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-ink font-medium">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded border-stone-300 text-ink focus:ring-0"
                  />
                  <span>Feature in Hero Spotlight on /looks</span>
                </label>
              </div>
            </div>
          </section>

          {/* Section 5: Editorial Imagery */}
          <section className="space-y-5 rounded border border-stone-200 bg-paper p-6">
            <h2 className="font-display text-lg text-ink">Editorial Imagery</h2>

            <div className="space-y-4">
              <Field label="Cover Image URL" hint="Main portrait photograph (e.g. Cloudinary or CDN URL)">
                <Input
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://..."
                />
              </Field>

              {coverImage && (
                <div className="aspect-[4/5] w-full bg-stone-100 overflow-hidden border border-stone-200">
                  <img
                    src={coverImage}
                    alt={coverImageAlt || name}
                    className="size-full object-cover"
                  />
                </div>
              )}

              <Field label="Cover Image Alt Text">
                <Input
                  value={coverImageAlt}
                  onChange={(e) => setCoverImageAlt(e.target.value)}
                  placeholder="e.g. Model wearing relaxed linen shirt and tailored shorts"
                />
              </Field>

              <Field label="Hero Banner URL (Optional)" hint="Widescreen banner for featured carousel">
                <Input
                  value={heroImage}
                  onChange={(e) => setHeroImage(e.target.value)}
                  placeholder="https://..."
                />
              </Field>

              <Field
                label="Gallery Images (Optional)"
                hint="Enter secondary styling or detail photograph URLs (one per line)"
              >
                <Textarea
                  rows={4}
                  value={galleryUrls}
                  onChange={(e) => setGalleryUrls(e.target.value)}
                  placeholder="https://...\nhttps://..."
                />
              </Field>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
