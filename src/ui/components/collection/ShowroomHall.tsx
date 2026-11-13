'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { AnimatePresence, m } from 'motion/react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plate } from '../../data/Plate';
import { useReducedMotionSafe } from '../../motion/MotionProvider';
import { Button } from '../../primitives/Button';
import { DUR, EASE } from '../../tokens/motion';
import { CarStudioImage } from '../CarStudioImage';
import { LightSweep } from './LightSweep';

/**
 * v3 Part 3 §8 — Showroom Collection Hall
 *
 * Pinned stage with 74% tyre baseline floor line, category rail,
 * animated 2D spawn transition between selected cars, mobile Embla carousel,
 * and zero-JS / reduced motion clean responsive grid fallback.
 */

export const TYRE_BASELINE_PERCENT = 74;
export const TYRE_BASELINE_FLOOR = '74%';

export interface ShowroomVehicleSpecs {
  rangeKm?: number;
  batteryKwh?: number;
  luggageLiters?: number;
  engineCc?: number;
}

export interface ShowroomVehicle {
  id?: number | string;
  slug: string;
  make: string;
  model: string;
  variant?: string | null;
  year: number;
  category: string;
  transmission: string;
  fuelType: string;
  seats: number;
  dailyMinor: number;
  primaryImageUrl?: string | null;
  primaryImageAlt?: string | null;
  thumbhash?: string;
  specs?: ShowroomVehicleSpecs;
  plate?: string;
  tagline?: string;
}

export interface ShowroomCategory {
  id: string;
  label: string;
}

export const SHOWROOM_CATEGORIES: readonly ShowroomCategory[] = [
  { id: 'all', label: 'All vehicles' },
  { id: 'ev', label: 'EV' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'suv', label: 'SUV' },
  { id: 'sedan', label: 'Sedan' },
  { id: 'hatchback', label: 'Hatchback' },
  { id: 'muv', label: 'MUV' },
] as const;

export const DEFAULT_SHOWROOM_VEHICLES: ShowroomVehicle[] = [
  {
    slug: 'tata-nexon-ev-lr',
    make: 'Tata',
    model: 'Nexon.ev',
    variant: 'Empowered+ LR',
    year: 2025,
    category: 'ev',
    transmission: 'automatic',
    fuelType: 'electric',
    seats: 5,
    dailyMinor: 360000,
    primaryImageUrl: '/api/uploads/public/vehicles/c8078a81-969e-44f7-bd76-e4625b2573ef-1280.webp',
    thumbhash: 'VzgKDIhJvJdrg4nIK3BMqZBmCQ==',
    specs: {
      rangeKm: 465,
      batteryKwh: 40.5,
      luggageLiters: 350,
    },
    plate: 'KA 01 EK 4092',
  },
  {
    slug: 'hyundai-ioniq-5-rwd',
    make: 'Hyundai',
    model: 'IONIQ 5',
    variant: 'RWD Long Range',
    year: 2025,
    category: 'ev',
    transmission: 'automatic',
    fuelType: 'electric',
    seats: 5,
    dailyMinor: 680000,
    primaryImageUrl: '/api/uploads/public/vehicles/91579899-225e-4052-8131-8cae2ba1a806-1280.webp',
    thumbhash: '2PcJDIJxhbh3ZWdAirPZ0IkMeQ==',
    specs: {
      rangeKm: 631,
      batteryKwh: 72.6,
      luggageLiters: 527,
    },
    plate: 'KA 03 NV 1055',
  },
  {
    slug: 'bmw-330li-m-sport',
    make: 'BMW',
    model: '3 Series Gran Limousine',
    variant: '330Li M Sport',
    year: 2025,
    category: 'luxury',
    transmission: 'automatic',
    fuelType: 'petrol',
    seats: 5,
    dailyMinor: 950000,
    primaryImageUrl: '/api/uploads/public/vehicles/6e41e1c0-a6df-47f8-8155-ad291d21682f-1280.webp',
    thumbhash: 'GggKC4JomJqwdJeGqYv/3vw=',
    specs: {
      engineCc: 1998,
      luggageLiters: 480,
    },
    plate: 'KA 04 MP 3300',
  },
  {
    slug: 'audi-a6-technology',
    make: 'Audi',
    model: 'A6',
    variant: '45 TFSI Technology',
    year: 2025,
    category: 'luxury',
    transmission: 'automatic',
    fuelType: 'petrol',
    seats: 5,
    dailyMinor: 1020000,
    primaryImageUrl: '/api/uploads/public/vehicles/a56c3f97-0138-4c55-8214-692e45728e0f-1280.webp',
    thumbhash: '3fcJDIJzm2ifdXhgiqaQkj8JmA==',
    specs: {
      engineCc: 1984,
      luggageLiters: 530,
    },
    plate: 'KA 01 MH 6006',
  },
  {
    slug: 'mahindra-xuv700-ax7l',
    make: 'Mahindra',
    model: 'XUV700',
    variant: 'AX7 Luxury AWD',
    year: 2025,
    category: 'suv',
    transmission: 'automatic',
    fuelType: 'diesel',
    seats: 7,
    dailyMinor: 480000,
    primaryImageUrl: '/api/uploads/public/vehicles/ab3ca15d-ec52-4e8d-99bb-954d718a091e-1280.webp',
    thumbhash: 'JggKDYCoiMm7Vnd8hweFbbeCfwv4',
    specs: {
      engineCc: 2198,
      luggageLiters: 450,
    },
    plate: 'KA 05 MK 7700',
  },
  {
    slug: 'hyundai-creta-sx-o-diesel',
    make: 'Hyundai',
    model: 'Creta',
    variant: 'SX(O) AT',
    year: 2025,
    category: 'suv',
    transmission: 'automatic',
    fuelType: 'diesel',
    seats: 5,
    dailyMinor: 340000,
    primaryImageUrl: '/api/uploads/public/vehicles/32292d37-dba2-4e17-90d0-76d767421246-1280.webp',
    thumbhash: 'ZAgKDYD3p3h6dYhtgiaWeYiAfRn4',
    specs: {
      engineCc: 1493,
      luggageLiters: 433,
    },
    plate: 'KA 02 MH 5412',
  },
  {
    slug: 'honda-city-ehev-zx',
    make: 'Honda',
    model: 'City e:HEV',
    variant: 'ZX Sensing',
    year: 2025,
    category: 'sedan',
    transmission: 'automatic',
    fuelType: 'hybrid',
    seats: 5,
    dailyMinor: 310000,
    primaryImageUrl: '/api/uploads/public/vehicles/5f5cd2ba-2a62-4859-a760-84edf683d319-1280.webp',
    thumbhash: 'JQgKDYDpp4eLdXdekwaWiaiFf0n4',
    specs: {
      engineCc: 1498,
      luggageLiters: 410,
    },
    plate: 'KA 03 MN 4821',
  },
  {
    slug: 'skoda-slavia-style-15',
    make: 'Skoda',
    model: 'Slavia',
    variant: 'Style 1.5 TSI DSG',
    year: 2025,
    category: 'sedan',
    transmission: 'automatic',
    fuelType: 'petrol',
    seats: 5,
    dailyMinor: 320000,
    primaryImageUrl: '/api/uploads/public/vehicles/4eb91b9a-8948-4ffc-be94-db8f4432ded3-1280.webp',
    thumbhash: 'XygKDYaqp5iEhYefYyWKa1h2gHUI',
    specs: {
      engineCc: 1498,
      luggageLiters: 521,
    },
    plate: 'KA 01 MJ 8190',
  },
  {
    slug: 'maruti-swift-zxi-plus',
    make: 'Maruti Suzuki',
    model: 'Swift',
    variant: 'ZXi+ AGS',
    year: 2025,
    category: 'hatchback',
    transmission: 'automatic',
    fuelType: 'petrol',
    seats: 5,
    dailyMinor: 190000,
    primaryImageUrl: '/api/uploads/public/vehicles/3eef92e0-8037-4823-8524-ab6a099e9081-1280.webp',
    thumbhash: '5/cFBYBTm7aNcpZakQeljXlwfAS3',
    specs: {
      engineCc: 1197,
      luggageLiters: 265,
    },
    plate: 'KA 04 MP 1123',
  },
  {
    slug: 'toyota-innova-hycross-zx',
    make: 'Toyota',
    model: 'Innova Hycross',
    variant: 'ZX(O) Hybrid',
    year: 2025,
    category: 'muv',
    transmission: 'automatic',
    fuelType: 'hybrid',
    seats: 7,
    dailyMinor: 540000,
    primaryImageUrl: '/api/uploads/public/vehicles/989f5f90-1aae-4f6b-89b8-8299875ab5d5-1280.webp',
    thumbhash: 'HwgOFoR5i2hgeHh0eXlpuHh1mH9p+ZY=',
    specs: {
      engineCc: 1987,
      luggageLiters: 300,
    },
    plate: 'KA 01 MM 9988',
  },
];

export function formatRupees(amountMinor: number): string {
  const major = Math.round(amountMinor / 100);
  return `₹${major.toLocaleString('en-IN')}`;
}

export interface ShowroomHallProps {
  vehicles?: ShowroomVehicle[];
  initialCategory?: string;
  initialVehicleSlug?: string;
  onReserve?: (vehicle: ShowroomVehicle) => void;
  className?: string;
  viewMode?: 'auto' | 'stage' | 'carousel' | 'grid';
  reducedMotion?: boolean;
}

export function ShowroomHall({
  vehicles = DEFAULT_SHOWROOM_VEHICLES,
  initialCategory = 'all',
  initialVehicleSlug,
  onReserve,
  className = '',
  viewMode = 'auto',
  reducedMotion: forcedReduced = false,
}: ShowroomHallProps) {
  const osReduced = useReducedMotionSafe();
  const isReduced = forcedReduced || osReduced;

  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);

  const filteredVehicles = useMemo(() => {
    if (activeCategory === 'all') return vehicles;
    return vehicles.filter((v) => v.category.toLowerCase() === activeCategory.toLowerCase());
  }, [vehicles, activeCategory]);

  const [selectedSlug, setSelectedSlug] = useState<string>(() => {
    if (initialVehicleSlug) {
      const match = vehicles.find((v) => v.slug === initialVehicleSlug);
      if (match) return match.slug;
    }
    return filteredVehicles[0]?.slug ?? vehicles[0]?.slug ?? '';
  });

  const selectedVehicle = useMemo(() => {
    const found = filteredVehicles.find((v) => v.slug === selectedSlug);
    if (found) return found;
    const fallback = filteredVehicles[0] ?? vehicles[0] ?? DEFAULT_SHOWROOM_VEHICLES[0];
    if (fallback) return fallback;
    return {
      slug: 'default',
      make: 'Kerb',
      model: 'Vehicle',
      year: 2025,
      category: 'ev',
      transmission: 'automatic',
      fuelType: 'electric',
      seats: 5,
      dailyMinor: 300000,
    };
  }, [filteredVehicles, vehicles, selectedSlug]);

  const handleSelectCategory = useCallback(
    (categoryId: string) => {
      setActiveCategory(categoryId);
      const nextFiltered =
        categoryId === 'all'
          ? vehicles
          : vehicles.filter((v) => v.category.toLowerCase() === categoryId.toLowerCase());
      if (nextFiltered[0]) {
        setSelectedSlug(nextFiltered[0].slug);
      }
    },
    [vehicles],
  );

  // Mobile Embla carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    loop: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const selectedCategoryMeta = SHOWROOM_CATEGORIES.find(
    (c) => c.id.toLowerCase() === selectedVehicle.category.toLowerCase(),
  );
  const selectedCategoryLabel = selectedCategoryMeta?.label ?? selectedVehicle.category;

  // Zero-JS / reduced motion fallback: clean responsive grid
  if (isReduced || viewMode === 'grid') {
    return (
      <section
        aria-label="Showroom Collection Hall"
        className={`space-y-6 ${className}`.trim()}
        data-testid="showroom-hall-grid-view"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-text-1">Collection Hall</h2>
            <p className="text-sm text-text-2">
              Browse our inspected Bengaluru self-drive fleet by body and powertrain.
            </p>
          </div>
          <CategoryRail activeCategory={activeCategory} onSelectCategory={handleSelectCategory} />
        </div>

        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="showroom-grid"
        >
          {filteredVehicles.map((vehicle) => (
            <VehicleCard key={vehicle.slug} vehicle={vehicle} onReserve={onReserve} />
          ))}
        </div>

        <noscript>
          <div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="showroom-noscript-grid"
          >
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.slug} vehicle={vehicle} onReserve={onReserve} />
            ))}
          </div>
        </noscript>
      </section>
    );
  }

  return (
    <section
      aria-label="Showroom Collection Hall"
      className={`space-y-8 ${className}`.trim()}
      data-testid="showroom-hall"
    >
      {/* Category rail */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-text-1">Collection Hall</h2>
          <p className="text-sm text-text-2">
            Curated Bengaluru fleet with guaranteed reservation and physical handovers.
          </p>
        </div>
        <CategoryRail activeCategory={activeCategory} onSelectCategory={handleSelectCategory} />
      </div>

      {/* DESKTOP VIEW (>= 1024px): Pinned stage with 74% tyre baseline */}
      {viewMode !== 'carousel' && (
        <div className="hidden space-y-6 lg:block" data-testid="desktop-showroom-stage">
          <div
            className="relative w-full overflow-hidden rounded-m border border-border bg-surface"
            style={{ minHeight: '440px' }}
            data-testid="showroom-pinned-stage"
          >
            {/* Floor plane beneath 74% tyre baseline */}
            <div
              data-testid="stage-floor-plane"
              className="pointer-events-none absolute inset-x-0 bottom-0 bg-surface-sunken"
              style={{ top: TYRE_BASELINE_FLOOR }}
            />

            {/* 74% tyre baseline floor line */}
            <div
              data-testid="stage-floor-line"
              className="pointer-events-none absolute inset-x-0 z-10 border-b border-border"
              style={{ top: TYRE_BASELINE_FLOOR }}
            />

            {/* Pinned stage header information */}
            <div className="relative z-20 flex items-start justify-between p-6">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-text-3">{selectedCategoryLabel}</span>
                <h3 className="font-display text-2xl font-bold text-text-1">
                  {selectedVehicle.make} {selectedVehicle.model}
                  {selectedVehicle.variant ? (
                    <span className="text-lg font-normal text-text-3">
                      {' '}
                      {selectedVehicle.variant}
                    </span>
                  ) : null}
                </h3>
                <p className="text-sm text-text-2">
                  {selectedVehicle.seats} seats, {selectedVehicle.transmission},{' '}
                  {selectedVehicle.fuelType}
                  {selectedVehicle.specs?.rangeKm
                    ? `, ${selectedVehicle.specs.rangeKm} km range`
                    : ''}
                </p>
              </div>

              <div className="flex flex-col items-end gap-3">
                <div className="text-right">
                  <span className="font-display text-3xl font-bold tabular-nums text-text-1">
                    {formatRupees(selectedVehicle.dailyMinor)}
                  </span>
                  <span className="ml-1 text-sm text-text-3">/ day</span>
                </div>
                <Button
                  variant="primary"
                  onClick={() => onReserve?.(selectedVehicle)}
                  data-testid="stage-reserve-cta"
                >
                  Reserve {selectedVehicle.model}
                </Button>
              </div>
            </div>

            {/* Animated 2D spawn transition between selected cars */}
            <div
              className="relative z-10 flex w-full items-center justify-center p-6"
              style={{ minHeight: '300px' }}
            >
              <AnimatePresence mode="wait">
                <m.div
                  key={selectedVehicle.slug}
                  initial={{ opacity: 0, x: 36, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -36, scale: 0.98 }}
                  transition={{ duration: DUR.base / 1000, ease: EASE.out }}
                  className="relative flex w-full max-w-2xl items-center justify-center"
                  data-testid="spawn-transition"
                >
                  <LightSweep
                    active
                    triggerKey={selectedVehicle.slug}
                    maskImageUrl={selectedVehicle.primaryImageUrl}
                    className="w-full"
                  >
                    {selectedVehicle.primaryImageUrl ? (
                      <CarStudioImage
                        src={selectedVehicle.primaryImageUrl}
                        alt={`${selectedVehicle.make} ${selectedVehicle.model}`}
                        thumbhash={selectedVehicle.thumbhash}
                        priority
                      />
                    ) : (
                      <div className="flex aspect-3/2 w-full flex-col items-center justify-center bg-plate p-6">
                        <span className="font-display text-2xl font-bold text-text-1">
                          {selectedVehicle.make} {selectedVehicle.model}
                        </span>
                        <span className="mt-1 text-sm text-text-3">Studio photography</span>
                      </div>
                    )}
                  </LightSweep>
                </m.div>
              </AnimatePresence>
            </div>

            {/* Selector rail for switching cars on stage */}
            <div
              className="relative z-20 flex items-center gap-3 overflow-x-auto border-t border-border bg-surface p-4"
              data-testid="stage-selector-rail"
            >
              {filteredVehicles.map((vehicle) => {
                const isCurrent = vehicle.slug === selectedVehicle.slug;
                return (
                  <button
                    key={vehicle.slug}
                    type="button"
                    onClick={() => setSelectedSlug(vehicle.slug)}
                    className={`flex shrink-0 items-center gap-3 rounded-s border p-2 text-left transition-colors duration-150 ${
                      isCurrent
                        ? 'border-accent bg-surface-raised shadow-e1'
                        : 'border-border-subtle bg-surface hover:border-border'
                    }`}
                    aria-pressed={isCurrent}
                  >
                    <div className="relative h-9 w-14 shrink-0 overflow-hidden rounded-xs bg-plate">
                      {vehicle.primaryImageUrl ? (
                        <img
                          src={vehicle.primaryImageUrl}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="h-full w-full bg-surface-sunken" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-text-1">
                        {vehicle.make} {vehicle.model}
                      </div>
                      <div className="text-xs tabular-nums text-text-3">
                        {formatRupees(vehicle.dailyMinor)} / day
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE VIEW (< 1024px): Embla carousel fallback */}
      {viewMode !== 'stage' && (
        <div className="block space-y-4 lg:hidden" data-testid="mobile-showroom-carousel">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium tabular-nums text-text-2">
              {selectedIndex + 1} of {filteredVehicles.length} vehicles
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={scrollPrev}
                disabled={!canScrollPrev}
                aria-label="Previous vehicle"
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={scrollNext}
                disabled={!canScrollNext}
                aria-label="Next vehicle"
              >
                Next
              </Button>
            </div>
          </div>

          <div className="overflow-hidden" ref={emblaRef} data-testid="embla-viewport">
            <div className="flex -ml-4" data-testid="embla-container">
              {filteredVehicles.map((vehicle) => (
                <div
                  key={vehicle.slug}
                  className="min-w-0 shrink-0 grow-0 pl-4"
                  style={{ width: '85%' }}
                  data-testid="embla-slide"
                >
                  <VehicleCard vehicle={vehicle} onReserve={onReserve} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clean responsive grid fallback for noscript / zero-JS */}
      <noscript>
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="showroom-noscript-grid"
        >
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.slug} vehicle={vehicle} onReserve={onReserve} />
          ))}
        </div>
      </noscript>
    </section>
  );
}

function CategoryRail({
  activeCategory,
  onSelectCategory,
}: {
  activeCategory: string;
  onSelectCategory: (id: string) => void;
}) {
  return (
    <nav aria-label="Showroom categories" className="flex flex-wrap items-center gap-2">
      {SHOWROOM_CATEGORIES.map((cat) => {
        const isSelected = activeCategory.toLowerCase() === cat.id.toLowerCase();
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`rounded-s px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
              isSelected
                ? 'border border-border bg-surface text-text-1 shadow-e1'
                : 'border border-transparent text-text-3 hover:bg-surface-sunken hover:text-text-1'
            }`}
            aria-pressed={isSelected}
            data-testid={`category-tab-${cat.id}`}
          >
            {cat.label}
          </button>
        );
      })}
    </nav>
  );
}

export function VehicleCard({
  vehicle,
  onReserve,
}: {
  vehicle: ShowroomVehicle;
  onReserve?: (vehicle: ShowroomVehicle) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const categoryMeta = SHOWROOM_CATEGORIES.find(
    (c) => c.id.toLowerCase() === vehicle.category.toLowerCase(),
  );
  const categoryLabel = categoryMeta?.label ?? vehicle.category;

  return (
    <article
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      className="flex h-full flex-col justify-between overflow-hidden rounded-m border border-border bg-surface transition-colors duration-200"
      data-testid={`vehicle-card-${vehicle.slug}`}
    >
      <div>
        <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2 bg-surface-sunken">
          <div className="flex items-center gap-2">
            <span className="text-label-s font-semibold text-text-3 font-technical">
              {categoryLabel}
            </span>
            <span className="inline-flex items-center gap-1 text-label-s text-success font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              <span>Ready</span>
            </span>
          </div>
          {vehicle.plate && <Plate code={vehicle.plate} size="sm" />}
        </div>

        <div className="relative aspect-3/2 w-full overflow-hidden bg-plate">
          <LightSweep
            active={isHovered}
            triggerKey={vehicle.slug}
            maskImageUrl={vehicle.primaryImageUrl}
          >
            {vehicle.primaryImageUrl ? (
              <CarStudioImage
                src={vehicle.primaryImageUrl}
                alt={`${vehicle.make} ${vehicle.model} in showroom`}
                thumbhash={vehicle.thumbhash}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
                <span className="font-display text-lg font-bold text-text-1">
                  {vehicle.make} {vehicle.model}
                </span>
                <span className="text-caption text-text-3">Studio profile</span>
              </div>
            )}
          </LightSweep>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <h3 className="font-display text-h3 font-bold text-text-1">
              {vehicle.make} {vehicle.model}
              {vehicle.variant ? (
                <span className="text-body-s font-normal text-text-3"> {vehicle.variant}</span>
              ) : null}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-2 font-technical tabular-nums">
            <span>{vehicle.seats} seats</span>
            <span>{vehicle.transmission}</span>
            <span>
              {vehicle.fuelType === 'electric' && vehicle.specs?.rangeKm
                ? `${vehicle.specs.rangeKm} km range`
                : vehicle.fuelType}
            </span>
            <span>250 km/day</span>
          </div>
        </div>
      </div>

      <div className="flex items-baseline justify-between border-t border-border-subtle p-4">
        <div>
          <span className="font-display text-h3 font-bold tabular-nums text-text-1">
            {formatRupees(vehicle.dailyMinor)}
          </span>
          <span className="ml-1 text-caption text-text-3">/ day</span>
        </div>

        {onReserve ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onReserve(vehicle)}
            data-testid={`reserve-cta-${vehicle.slug}`}
          >
            Reserve {vehicle.model}
          </Button>
        ) : (
          <Link href={`/cars/${vehicle.slug}`}>
            <Button variant="primary" size="sm" data-testid={`reserve-cta-${vehicle.slug}`}>
              Reserve {vehicle.model}
            </Button>
          </Link>
        )}
      </div>
    </article>
  );
}
