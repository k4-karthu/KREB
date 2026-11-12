'use client';

import { useState } from 'react';

export interface GalleryImage {
  id: number;
  fileKey: string;
  altText: string;
  shotType: string | null;
}

export function Gallery({
  images,
  paintName,
  paintHex,
  vehicleTitle,
}: {
  images: GalleryImage[];
  paintName: string;
  paintHex: string;
  vehicleTitle: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = images[activeIdx];

  return (
    <div className="space-y-3">
      <div
        className="relative aspect-[3/2] overflow-hidden rounded-m border border-line bg-surface-subtle"
        style={{ backgroundColor: active ? undefined : paintHex }}
      >
        {active ? (
          <img
            src={`/api/uploads/public/${active.fileKey}-1280.webp`}
            alt={active.altText || vehicleTitle}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-start justify-end p-6 text-surface">
            <span className="rounded-s bg-ink/80 px-2.5 py-1 text-xs font-medium">
              Studio paint: {paintName}
            </span>
          </div>
        )}
        <div
          aria-hidden="true"
          className="h-1 w-full absolute bottom-0 left-0"
          style={{ backgroundColor: paintHex }}
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-s border-2 ${
                idx === activeIdx ? 'border-petrol-600' : 'border-line opacity-75 hover:opacity-100'
              }`}
              aria-label={`View ${img.shotType ?? 'photo'} ${idx + 1}`}
            >
              <img
                src={`/api/uploads/public/${img.fileKey}-640.webp`}
                alt={img.altText}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
