'use client';

import { ArrowDown, ArrowUp, Check, ImageSquare, Star, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '@/ui/primitives/Button';

export interface VehicleImageRow {
  id: number;
  public_id: string;
  file_key: string;
  width: number;
  height: number;
  alt_text: string;
  shot_type: string | null;
  is_primary: number;
  sort_order: number;
}

const SHOT_TYPES = [
  { value: 'front34', label: 'Front 3/4' },
  { value: 'side', label: 'Side profile' },
  { value: 'rear34', label: 'Rear 3/4' },
  { value: 'interior', label: 'Interior' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'boot', label: 'Boot space' },
  { value: 'detail', label: 'Detail' },
  { value: 'other', label: 'Other' },
] as const;

export function ImageManager({
  vehicleId,
  initialImages,
}: {
  vehicleId: number;
  initialImages: VehicleImageRow[];
}) {
  const [images, setImages] = useState<VehicleImageRow[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [shotType, setShotType] = useState<string>('front34');
  const [altText, setAltText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const presentShots = new Set(images.map((im) => im.shot_type).filter(Boolean));

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const nextList = [...images];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('shotType', shotType);
        fd.append('altText', altText.trim() || `${file.name.replace(/\.[^.]+$/, '')}`);
        const res = await fetch(`/api/admin/vehicles/${vehicleId}/images`, {
          method: 'POST',
          body: fd,
        });
        const data = (await res.json()) as { image?: VehicleImageRow; error?: string };
        if (!res.ok || !data.image) {
          throw new Error(data.error ?? 'Upload failed');
        }
        nextList.push(data.image);
      }
      setImages(nextList);
      setAltText('');
      e.target.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function setPrimary(imageId: number) {
    setError(null);
    const res = await fetch(`/api/admin/vehicles/${vehicleId}/images`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_primary', imageId }),
    });
    if (!res.ok) {
      setError('Failed to set primary image');
      return;
    }
    setImages((prev) => prev.map((img) => ({ ...img, is_primary: img.id === imageId ? 1 : 0 })));
  }

  async function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const reordered = [...images];
    const [moved] = reordered.splice(index, 1);
    if (!moved) return;
    reordered.splice(target, 0, moved);
    setImages(reordered);

    const res = await fetch(`/api/admin/vehicles/${vehicleId}/images`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reorder',
        orderedIds: reordered.map((i) => i.id),
      }),
    });
    if (!res.ok) {
      setError('Could not save image order');
    }
  }

  async function updateMeta(img: VehicleImageRow, nextAlt: string, nextShot: string | null) {
    const res = await fetch(`/api/admin/vehicles/${vehicleId}/images`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_meta',
        imageId: img.id,
        altText: nextAlt,
        shotType: nextShot,
      }),
    });
    if (res.ok) {
      setImages((prev) =>
        prev.map((i) => (i.id === img.id ? { ...i, alt_text: nextAlt, shot_type: nextShot } : i)),
      );
    }
  }

  async function removeImage(imageId: number) {
    setError(null);
    const res = await fetch(`/api/admin/vehicles/${vehicleId}/images?imageId=${imageId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      setError('Failed to delete image');
      return;
    }
    setImages((prev) => {
      const remaining = prev.filter((i) => i.id !== imageId);
      const first = remaining[0];
      if (first && !remaining.some((i) => i.is_primary === 1)) {
        remaining[0] = { ...first, is_primary: 1 };
      }
      return remaining;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="text-base font-semibold text-text-1">Gallery & Shot Coverage</h3>
          <p className="text-xs text-text-2">
            JPEG, PNG, or WebP up to 12 MB. Processed locally to 1600/800/400 WebP.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['front34', 'side', 'rear34', 'interior', 'boot'] as const).map((shot) => {
            const has = presentShots.has(shot);
            return (
              <span
                key={shot}
                className={`inline-flex items-center gap-1 rounded-s border px-2 py-0.5 text-xs ${
                  has
                    ? 'border-success bg-success-subtle text-success'
                    : 'border-border bg-surface-sunken text-text-2'
                }`}
              >
                {has && <Check size={12} />}
                {SHOT_TYPES.find((s) => s.value === shot)?.label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 rounded-m border border-dashed border-border-strong bg-surface-sunken p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="space-y-1 text-xs font-medium text-text-1">
          <span>Shot type</span>
          <select
            value={shotType}
            onChange={(e) => setShotType(e.target.value)}
            className="h-10 w-full rounded-s border border-border bg-surface px-3 text-sm text-text-1"
          >
            {SHOT_TYPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-text-1">
          <span>Alt description</span>
          <input
            type="text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="e.g. Front three-quarter studio view"
            className="h-10 w-full rounded-s border border-border bg-surface px-3 text-sm text-text-1"
          />
        </label>
        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-s bg-text-1 px-4 text-sm font-medium text-surface hover:opacity-90">
          <ImageSquare size={16} />
          <span>{uploading ? 'Processing...' : 'Upload photos'}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={uploading}
            onChange={handleUpload}
            className="sr-only"
          />
        </label>
      </div>

      {error && (
        <p className="rounded-s border border-danger bg-danger-subtle px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      {images.length === 0 ? (
        <div className="rounded-m border border-border bg-surface-sunken p-6 text-center text-sm text-text-2">
          No photographs uploaded yet. Public cards will show the studio paint swatch until a
          primary photo is uploaded.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="flex flex-col overflow-hidden rounded-m border border-border bg-surface"
            >
              <div className="relative aspect-[3/2] bg-surface-sunken">
                <img
                  src={`/api/uploads/public/${img.file_key}-640.webp`}
                  alt={img.alt_text}
                  className="h-full w-full object-cover"
                />
                {img.is_primary === 1 && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-s bg-text-1 px-2 py-0.5 text-xs font-medium text-surface">
                    <Star size={12} weight="fill" /> Primary
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <input
                  type="text"
                  defaultValue={img.alt_text}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== img.alt_text) {
                      void updateMeta(img, e.target.value.trim(), img.shot_type);
                    }
                  }}
                  aria-label="Image alt text"
                  className="h-8 rounded-s border border-border bg-surface-sunken px-2 text-xs text-text-1"
                />
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="tertiary"
                      disabled={idx === 0}
                      onClick={() => void moveImage(idx, -1)}
                      aria-label="Move image earlier"
                    >
                      <ArrowUp size={14} />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="tertiary"
                      disabled={idx === images.length - 1}
                      onClick={() => void moveImage(idx, 1)}
                      aria-label="Move image later"
                    >
                      <ArrowDown size={14} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    {img.is_primary !== 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => void setPrimary(img.id)}
                      >
                        Set primary
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="tertiary"
                      onClick={() => void removeImage(img.id)}
                      aria-label="Delete image"
                    >
                      <Trash size={14} className="text-danger" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
