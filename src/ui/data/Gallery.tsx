'use client';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

export interface GalleryImageItem {
  id: string | number;
  src: string;
  alt: string;
  thumbhash?: string;
}

export interface GalleryProps {
  images: GalleryImageItem[];
  priorityFirst?: boolean;
  className?: string;
}

/**
 * Kerb v3 Gallery:
 * Embla carousel vehicle image gallery with dot pagination and arrow navigation.
 */
export function Gallery({ images, priorityFirst = true, className = '' }: GalleryProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi],
  );

  useEffect(() => {
    if (!emblaApi) return;

    setScrollSnaps(emblaApi.scrollSnapList());
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on('select', onSelect);
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  if (!images || images.length === 0) {
    return (
      <div
        className={`flex aspect-3/2 w-full items-center justify-center rounded-l border border-border-subtle bg-surface-sunken text-label-s text-text-3 ${className}`.trim()}
      >
        No vehicle images available.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      {/* Main Carousel Viewport */}
      <div className="relative overflow-hidden rounded-l border border-border-subtle bg-plate shadow-e0">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {images.map((img, idx) => (
              <div key={img.id} className="relative aspect-3/2 w-full flex-none overflow-hidden">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 800px"
                  priority={priorityFirst && idx === 0}
                  className="object-contain"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Carousel Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={scrollPrev}
              aria-label="Previous image"
              className="absolute top-1/2 left-3 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-raised/90 text-text-1 shadow-e1 transition-colors hover:bg-surface cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
            >
              <CaretLeft size={18} weight="bold" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              aria-label="Next image"
              className="absolute top-1/2 right-3 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-raised/90 text-text-1 shadow-e1 transition-colors hover:bg-surface cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
            >
              <CaretRight size={18} weight="bold" />
            </button>
          </>
        )}

        {/* Dot Pagination */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-surface-raised/85 px-3 py-1.5 shadow-e1">
            {scrollSnaps.map((_, idx) => (
              <button
                key={`dot-${images[idx]?.id ?? idx}`}
                type="button"
                onClick={() => scrollTo(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === selectedIndex ? 'w-5 bg-accent' : 'w-1.5 bg-border-strong hover:bg-text-3'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail Bar */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => scrollTo(idx)}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xs border-2 transition-all cursor-pointer bg-plate ${
                idx === selectedIndex
                  ? 'border-accent shadow-e1'
                  : 'border-border-subtle opacity-70 hover:opacity-100'
              }`}
            >
              <Image src={img.src} alt={img.alt} fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
