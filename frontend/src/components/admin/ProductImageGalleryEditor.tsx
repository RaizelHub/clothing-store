import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import {
  deleteProductImage,
  getMediaConfig,
  reorderProductImages,
  updateProductImage,
  uploadProductImages,
} from "@/api/admin";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/fields";
import { Notice } from "@/components/ui/misc";
import { getApiErrorMessage } from "@/lib/errors";
import { getImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";
import type { Color, ProductImage } from "@/types/api";

export interface QueuedLocalImage {
  key: string;
  file: File;
  previewUrl: string;
  alt: string;
  color_id: number | null;
  is_primary: boolean;
}

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const VIEW_PRESETS = ["Front view", "Back view", "Side view", "Detail shot", "Lifestyle"];

interface Props {
  productId?: number;
  colors: Color[];
  images: ProductImage[];
  onImagesChange: (next: ProductImage[]) => void;
  queuedFiles: QueuedLocalImage[];
  onQueuedFilesChange: (next: QueuedLocalImage[]) => void;
}

export function ProductImageGalleryEditor({
  productId,
  colors,
  images,
  onImagesChange,
  queuedFiles,
  onQueuedFilesChange,
}: Props) {
  const { data: mediaConfig } = useQuery({
    queryKey: ["admin", "media", "config"],
    queryFn: getMediaConfig,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [defaultColorId, setDefaultColorId] = useState<number | "">("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyImageId, setBusyImageId] = useState<number | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [gallerySuccess, setGallerySuccess] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const maxSizeMb = mediaConfig?.max_file_size_mb ?? 8;
  const maxBytes = maxSizeMb * 1024 * 1024;

  const validateClientFiles = (fileList: File[]): string | null => {
    for (const f of fileList) {
      if (!ACCEPTED_MIME_TYPES.includes(f.type)) {
        return `"${f.name}" is not a supported format. Allowed: JPEG, PNG, WEBP, AVIF.`;
      }
      if (f.size > maxBytes) {
        return `"${f.name}" exceeds the ${maxSizeMb} MB file size limit.`;
      }
      if (f.size === 0) {
        return `"${f.name}" is an empty file.`;
      }
    }
    return null;
  };

  const handleFilesSelected = (incoming: FileList | File[]) => {
    const fileArr = Array.from(incoming);
    if (!fileArr.length) return;
    setGalleryError(null);
    setGallerySuccess(null);

    const validationErr = validateClientFiles(fileArr);
    if (validationErr) {
      setGalleryError(validationErr);
      return;
    }

    const chosenColor = defaultColorId === "" ? null : Number(defaultColorId);
    const hasAnyExistingPrimary =
      images.some((i) => i.is_primary) || queuedFiles.some((q) => q.is_primary);

    const nextQueued: QueuedLocalImage[] = fileArr.map((file, idx) => ({
      key: `queued-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim(),
      color_id: chosenColor,
      is_primary: !hasAnyExistingPrimary && idx === 0 && images.length === 0 && queuedFiles.length === 0,
    }));

    onQueuedFilesChange([...queuedFiles, ...nextQueued]);
  };

  const uploadQueuedNow = async () => {
    if (!productId || !queuedFiles.length) return;
    setGalleryError(null);
    setGallerySuccess(null);
    setUploading(true);
    setUploadProgress(5);

    const updatedGallery = [...images];
    const remainingQueue: QueuedLocalImage[] = [];

    try {
      for (let i = 0; i < queuedFiles.length; i++) {
        const item = queuedFiles[i];
        try {
          const uploaded = await uploadProductImages(productId, [item.file], {
            alt: item.alt,
            color_id: item.color_id,
            is_primary: item.is_primary,
            onProgress: (pct) => {
              const overall = Math.round(((i + pct / 100) / queuedFiles.length) * 100);
              setUploadProgress(overall);
            },
          });
          uploaded.forEach((u) => {
            if (u.is_primary) {
              updatedGallery.forEach((ex) => {
                ex.is_primary = false;
              });
            }
            updatedGallery.push(u);
          });
          URL.revokeObjectURL(item.previewUrl);
        } catch (err) {
          remainingQueue.push(...queuedFiles.slice(i));
          setGalleryError(getApiErrorMessage(err));
          break;
        }
      }

      onImagesChange(updatedGallery);
      onQueuedFilesChange(remainingQueue);
      if (remainingQueue.length === 0) {
        setGallerySuccess(
          `Uploaded ${queuedFiles.length} ${queuedFiles.length === 1 ? "image" : "images"} to gallery.`
        );
      }
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleSetPrimary = async (img: ProductImage) => {
    if (!productId || img.is_primary) return;
    setGalleryError(null);
    setBusyImageId(img.id);
    try {
      const updated = await updateProductImage(productId, img.id, { is_primary: true });
      onImagesChange(
        images.map((item) =>
          item.id === updated.id ? { ...updated, is_primary: true } : { ...item, is_primary: false }
        )
      );
    } catch (err) {
      setGalleryError(getApiErrorMessage(err));
    } finally {
      setBusyImageId(null);
    }
  };

  const handleReplaceFile = async (img: ProductImage, file: File) => {
    if (!productId) return;
    setGalleryError(null);
    setGallerySuccess(null);
    const err = validateClientFiles([file]);
    if (err) {
      setGalleryError(err);
      return;
    }

    setBusyImageId(img.id);
    setUploadProgress(10);
    try {
      const replaced = await updateProductImage(
        productId,
        img.id,
        { file, alt: img.alt, color_id: img.color },
        (pct) => setUploadProgress(pct)
      );
      onImagesChange(images.map((item) => (item.id === replaced.id ? replaced : item)));
      setGallerySuccess("Image replaced safely.");
    } catch (e) {
      setGalleryError(getApiErrorMessage(e));
    } finally {
      setBusyImageId(null);
      setUploadProgress(null);
    }
  };

  const handleMetadataBlur = async (img: ProductImage, patch: { alt?: string; color_id?: number | null }) => {
    if (!productId) return;
    setGalleryError(null);
    try {
      const updated = await updateProductImage(productId, img.id, patch);
      onImagesChange(images.map((item) => (item.id === updated.id ? updated : item)));
    } catch (e) {
      setGalleryError(getApiErrorMessage(e));
    }
  };

  const handleDeleteImage = async (img: ProductImage) => {
    if (!productId) return;
    setGalleryError(null);
    setBusyImageId(img.id);
    try {
      const res = await deleteProductImage(productId, img.id);
      onImagesChange(res.images);
    } catch (e) {
      setGalleryError(getApiErrorMessage(e));
    } finally {
      setBusyImageId(null);
    }
  };

  const handleMove = async (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= images.length || fromIdx === toIdx) return;
    const next = [...images];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    const optimistic = next.map((item, idx) => ({ ...item, position: idx }));
    onImagesChange(optimistic);

    if (!productId) return;
    setGalleryError(null);
    try {
      const serverOrdered = await reorderProductImages(
        productId,
        optimistic.map((i) => i.id)
      );
      onImagesChange(serverOrdered);
    } catch (e) {
      setGalleryError(getApiErrorMessage(e));
      onImagesChange(images);
    }
  };

  const removeQueued = (key: string) => {
    const target = queuedFiles.find((q) => q.key === key);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onQueuedFilesChange(queuedFiles.filter((q) => q.key !== key));
  };

  const updateQueued = (key: string, patch: Partial<QueuedLocalImage>) => {
    onQueuedFilesChange(
      queuedFiles.map((q) => {
        if (q.key === key) return { ...q, ...patch };
        if (patch.is_primary) return { ...q, is_primary: false };
        return q;
      })
    );
  };

  const moveQueued = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= queuedFiles.length) return;
    const next = [...queuedFiles];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onQueuedFilesChange(next);
  };

  const totalCount = images.length + queuedFiles.length;

  return (
    <section className="space-y-5 border border-stone-200 p-6">
      {/* Header & Storage Status */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-stone-500">
            <ImageIcon size={14} /> Product Images &amp; Gallery
          </h2>
          <p className="mt-1 text-xs text-stone-400">
            Upload front, back, side, detail, and lifestyle photography. Link images to specific colors or keep them in the main gallery.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          {mediaConfig && (
            <span
              className={cn(
                "border px-2 py-0.5 uppercase tracking-wider",
                mediaConfig.configured
                  ? "border-stone-300 bg-stone-50 text-stone-600"
                  : "border-accent text-accent"
              )}
            >
              {mediaConfig.provider}
            </span>
          )}
          <span className="text-stone-500">
            {totalCount} {totalCount === 1 ? "image" : "images"}
          </span>
        </div>
      </div>

      {/* Missing Cloudinary Config Warning */}
      {mediaConfig && !mediaConfig.configured && mediaConfig.error && (
        <Notice tone="error">{mediaConfig.error}</Notice>
      )}

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFilesSelected(e.dataTransfer.files);
        }}
        className={cn(
          "border border-dashed p-5 transition-colors",
          dragOver ? "border-ink bg-stone-100/80" : "border-stone-300 bg-stone-50/50"
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink">
              <Upload size={14} strokeWidth={1.5} /> Add Product Photography
            </p>
            <p className="text-xs text-stone-500">
              Drag and drop files here or browse. Supports JPEG, PNG, WEBP, AVIF up to {maxSizeMb} MB each.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-44">
              <Field label="Default color tag" optional>
                <Select
                  value={defaultColorId}
                  onChange={(e) => setDefaultColorId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="!py-1.5 text-xs"
                >
                  <option value="">All colors (Main gallery)</option>
                  {colors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  handleFilesSelected(e.target.files);
                  e.target.value = "";
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || (mediaConfig ? !mediaConfig.configured : false)}
            >
              Select Images
            </Button>
          </div>
        </div>

        {/* Upload progress indicator */}
        {uploadProgress !== null && (
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-stone-600">
              <span className="flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Uploading to {mediaConfig?.provider ?? "storage"}...
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1 w-full bg-stone-200">
              <div className="h-full bg-ink transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      {galleryError && <Notice tone="error">{galleryError}</Notice>}
      {gallerySuccess && <Notice tone="success">{gallerySuccess}</Notice>}

      {/* Queued Previews (Before Uploading / Saving) */}
      {queuedFiles.length > 0 && (
        <div className="space-y-3 border border-stone-200 bg-paper p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-ink">
                Ready to Upload ({queuedFiles.length})
              </p>
              <p className="text-[11px] text-stone-500">
                {productId
                  ? "Preview and label your images below, then click Upload Now."
                  : "These previews will upload automatically when you click Create product."}
              </p>
            </div>
            {productId && (
              <Button type="button" size="sm" onClick={uploadQueuedNow} loading={uploading}>
                Upload {queuedFiles.length} {queuedFiles.length === 1 ? "Image" : "Images"}
              </Button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {queuedFiles.map((q, idx) => (
              <div key={q.key} className="flex gap-3 border border-stone-200 bg-stone-50/40 p-3">
                <div className="relative h-28 w-22 shrink-0 overflow-hidden border border-stone-200 bg-stone-100">
                  <img src={q.previewUrl} alt={q.alt || "Upload preview"} className="h-full w-full object-cover" />
                  {q.is_primary && (
                    <span className="absolute inset-x-0 bottom-0 bg-ink py-0.5 text-center font-mono text-[8px] uppercase tracking-wider text-paper">
                      Primary
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Field label="Alt text">
                    <Input
                      value={q.alt}
                      onChange={(e) => updateQueued(q.key, { alt: e.target.value })}
                      className="!px-2 !py-1 text-xs"
                      placeholder="e.g. Front view"
                    />
                  </Field>
                  <div className="flex flex-wrap gap-1">
                    {VIEW_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => updateQueued(q.key, { alt: preset })}
                        className="border border-stone-200 px-1.5 py-0.5 text-[9.5px] text-stone-500 hover:border-ink hover:text-ink"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={q.color_id ?? ""}
                      onChange={(e) =>
                        updateQueued(q.key, {
                          color_id: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      className="!px-2 !py-1 text-xs"
                    >
                      <option value="">All colors</option>
                      {colors.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => updateQueued(q.key, { is_primary: true })}
                        title="Set as primary image"
                        className={cn(
                          "border px-1.5 py-1 text-[10px] uppercase tracking-wider",
                          q.is_primary ? "border-ink bg-ink text-paper" : "border-stone-200 text-stone-500 hover:border-ink"
                        )}
                      >
                        <Star size={11} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveQueued(idx, idx - 1)}
                        className="border border-stone-200 p-1 text-stone-500 hover:border-ink disabled:opacity-30"
                        aria-label="Move earlier"
                      >
                        <ArrowLeft size={11} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === queuedFiles.length - 1}
                        onClick={() => moveQueued(idx, idx + 1)}
                        className="border border-stone-200 p-1 text-stone-500 hover:border-ink disabled:opacity-30"
                        aria-label="Move later"
                      >
                        <ArrowRight size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQueued(q.key)}
                        className="border border-stone-200 p-1 text-stone-400 hover:border-accent hover:text-accent"
                        aria-label="Remove queued image"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Persisted Gallery Images */}
      {images.length === 0 && queuedFiles.length === 0 ? (
        <div className="border border-dashed border-stone-200 py-8 text-center text-xs text-stone-400">
          No product images uploaded yet. Upload photography above to build the storefront gallery.
        </div>
      ) : images.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {images.map((img, idx) => {
            const isBusy = busyImageId === img.id;
            const previewSrc = getImageUrl(img, "admin_preview");
            return (
              <div
                key={img.id}
                draggable
                onDragStart={() => setDraggedIndex(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedIndex !== null && draggedIndex !== idx) {
                    handleMove(draggedIndex, idx);
                  }
                  setDraggedIndex(null);
                }}
                className={cn(
                  "flex gap-3 border bg-paper p-3 transition-colors",
                  img.is_primary ? "border-ink" : "border-stone-200",
                  isBusy && "opacity-60"
                )}
              >
                {/* Thumbnail Preview */}
                <div className="relative h-28 w-22 shrink-0 overflow-hidden border border-stone-200 bg-stone-100">
                  <img
                    src={previewSrc}
                    alt={img.alt || "Product preview"}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.opacity = "0.2";
                    }}
                  />
                  {img.is_primary && (
                    <span className="absolute inset-x-0 bottom-0 bg-ink py-0.5 text-center font-mono text-[8px] uppercase tracking-wider text-paper">
                      Primary
                    </span>
                  )}
                  <span className="absolute left-1 top-1 bg-paper/90 px-1 font-mono text-[9px] text-ink">
                    #{idx + 1}
                  </span>
                </div>

                {/* Metadata & Actions */}
                <div className="min-w-0 flex-1 space-y-2">
                  <Field label="Alt description">
                    <Input
                      value={img.alt}
                      onChange={(e) =>
                        onImagesChange(
                          images.map((item) => (item.id === img.id ? { ...item, alt: e.target.value } : item))
                        )
                      }
                      onBlur={() => handleMetadataBlur(img, { alt: img.alt })}
                      className="!px-2 !py-1 text-xs"
                      placeholder="Front view, Back view, Detail shot..."
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Variant color">
                      <Select
                        value={img.color ?? ""}
                        onChange={(e) => {
                          const nextColor = e.target.value === "" ? null : Number(e.target.value);
                          onImagesChange(
                            images.map((item) => (item.id === img.id ? { ...item, color: nextColor } : item))
                          );
                          handleMetadataBlur(img, { color_id: nextColor });
                        }}
                        className="!px-2 !py-1 text-xs"
                      >
                        <option value="">All colors</option>
                        {colors.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <div className="flex flex-col justify-end">
                      <span className="truncate font-mono text-[10px] text-stone-400">
                        {img.storage_provider ?? "external"}
                        {img.width && img.height ? ` · ${img.width}×${img.height}` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-stone-100 pt-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isBusy || img.is_primary}
                        onClick={() => handleSetPrimary(img)}
                        className={cn(
                          "inline-flex items-center gap-1 border px-2 py-1 text-[10px] uppercase tracking-wider transition-colors",
                          img.is_primary
                            ? "border-ink bg-ink text-paper"
                            : "border-stone-200 text-stone-600 hover:border-ink hover:text-ink"
                        )}
                      >
                        <Star size={10} /> {img.is_primary ? "Primary" : "Set Primary"}
                      </button>

                      <label
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-1 border border-stone-200 px-2 py-1 text-[10px] uppercase tracking-wider text-stone-600 transition-colors hover:border-ink hover:text-ink",
                          isBusy && "pointer-events-none opacity-50"
                        )}
                      >
                        <RefreshCw size={10} /> Replace
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleReplaceFile(img, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isBusy || idx === 0}
                        onClick={() => handleMove(idx, idx - 1)}
                        aria-label="Move image earlier"
                        className="border border-stone-200 p-1 text-stone-500 hover:border-ink disabled:opacity-30"
                      >
                        <ArrowLeft size={11} />
                      </button>
                      <button
                        type="button"
                        disabled={isBusy || idx === images.length - 1}
                        onClick={() => handleMove(idx, idx + 1)}
                        aria-label="Move image later"
                        className="border border-stone-200 p-1 text-stone-500 hover:border-ink disabled:opacity-30"
                      >
                        <ArrowRight size={11} />
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDeleteImage(img)}
                        aria-label="Delete image"
                        className="border border-stone-200 p-1 text-stone-400 hover:border-accent hover:text-accent"
                      >
                        {isBusy ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
