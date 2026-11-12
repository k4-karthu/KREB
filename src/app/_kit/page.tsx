'use client';

import { useState } from 'react';
import { formatMoney } from '@/domain/shared/money';
import { ProtectionCards } from '@/ui/components/ProtectionCards';
import { SpecSheet } from '@/ui/components/SpecSheet';
import { Stepper } from '@/ui/components/Stepper';
import { ThemeToggle } from '@/ui/components/ThemeToggle';
import { TripTicket } from '@/ui/components/TripTicket';
import { VehicleTile } from '@/ui/components/VehicleTile';
import { LaneLine } from '@/ui/motion/LaneLine';
import { useReducedMotionToggle } from '@/ui/motion/MotionProvider';
import { PlateStamp } from '@/ui/motion/PlateStamp';
import { RollingNumber } from '@/ui/motion/RollingNumber';
import { Button } from '@/ui/primitives/Button';
import { Dialog } from '@/ui/primitives/Dialog';
import { Field, Input, Select } from '@/ui/primitives/Field';
import { MoneyText } from '@/ui/primitives/MoneyText';
import { Plate } from '@/ui/primitives/Plate';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { StatusBadge } from '@/ui/primitives/StatusBadge';

export default function KitPage() {
  const { forcedReduced, setForcedReduced } = useReducedMotionToggle();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('standard');
  const [rollingPrice, setRollingPrice] = useState(924000);
  const [stepIdx, setStepIdx] = useState(1);

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 space-y-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="font-display-wide text-4 text-petrol-800">Kerb Design Kit</h1>
          <p className="text-0 text-stone-500 mt-1">
            Living token and component reference built against §11.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => setForcedReduced(!forcedReduced)}>
            {forcedReduced ? 'Reduced motion: On' : 'Reduced motion: Off'}
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <section aria-labelledby="kit-buttons" className="space-y-4">
        <h2 id="kit-buttons" className="text-2 font-bold text-petrol-800">
          Buttons, Plates & Status
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Show cars</Button>
          <Button variant="secondary">Modify dates</Button>
          <Button variant="tertiary">Read fuel policy</Button>
          <Button variant="danger">Cancel trip</Button>
          <Button variant="primary" loading>
            Saving
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Plate code="KA 03 MN 4821" paintHex="var(--surface-sunken)" />
          <Plate code="KB7-4Q2" size="lg" />
          <StatusBadge status="confirmed" />
          <StatusBadge status="active" />
          <StatusBadge status="pending_approval" />
          <StatusBadge status="overdue" />
          <StatusBadge status="maintenance" />
        </div>
      </section>

      <section aria-labelledby="kit-motion" className="space-y-4">
        <h2 id="kit-motion" className="text-2 font-bold text-petrol-800">
          Motion Moments (§11.8)
        </h2>
        <div className="space-y-4 rounded-m border border-stone-200 bg-sheet p-6">
          <div>
            <p className="text-m1 text-stone-500 mb-2">LaneLine draw-in reveal</p>
            <LaneLine mode="reveal" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div>
              <p className="text-m1 text-stone-500">Rolling tabular figure</p>
              <RollingNumber
                value={rollingPrice}
                format={(n) => formatMoney(n, 'INR', 'en-IN')}
                className="font-display text-3 font-bold text-petrol-800"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRollingPrice((p) => (p === 924000 ? 1175988 : 924000))}
            >
              Toggle total
            </Button>
          </div>
          <div>
            <p className="text-m1 text-stone-500 mb-2">Confirmation PlateStamp</p>
            <PlateStamp>
              <Plate code="KB9-2X7" size="lg" />
            </PlateStamp>
          </div>
        </div>
      </section>

      <section aria-labelledby="kit-forms" className="space-y-4">
        <h2 id="kit-forms" className="text-2 font-bold text-petrol-800">
          Form Fields, Stepper & Overlays
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field id="kit-pickup" label="Pick-up branch" hint="All branches open at 07:00">
            <Select id="kit-pickup" defaultValue="indiranagar">
              <option value="indiranagar">Indiranagar Hub</option>
              <option value="airport">Kempegowda Airport (BLR)</option>
            </Select>
          </Field>
          <Field id="kit-email" label="Email address" required>
            <Input id="kit-email" type="email" placeholder="meera@example.com" />
          </Field>
          <Field
            id="kit-licence"
            label="Licence expiry"
            error="Your licence expires on 12 Mar, before your return on 14 Mar."
          >
            <Input id="kit-licence" type="date" defaultValue="2026-03-12" aria-invalid="true" />
          </Field>
        </div>

        <div className="pt-4 space-y-3">
          <Stepper
            steps={[
              { id: 'trip', label: 'Trip' },
              { id: 'you', label: 'You' },
              { id: 'pay', label: 'Pay' },
            ]}
            currentIndex={stepIdx}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setStepIdx(Math.max(0, stepIdx - 1))}
            >
              Previous step
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setStepIdx(Math.min(2, stepIdx + 1))}
            >
              Next step
            </Button>
            <Button size="sm" variant="primary" onClick={() => setDialogOpen(true)}>
              Open dialog
            </Button>
          </div>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Fuel and mileage rules"
          description="Return the vehicle with the same fuel level shown at check-out."
        >
          <p className="text-0 text-petrol-800">
            Includes 250 km per day. Extra distance is billed at ₹14 per km at check-in.
          </p>
        </Dialog>
      </section>

      <section aria-labelledby="kit-rental" className="space-y-6">
        <h2 id="kit-rental" className="text-2 font-bold text-petrol-800">
          Rental Components
        </h2>

        <ProtectionCards
          selectedPublicId={selectedPlan}
          onChange={setSelectedPlan}
          plans={[
            {
              publicId: 'basic',
              tier: 1,
              name: 'Basic Protection',
              summary: 'Standard third-party and collision cover.',
              covered: 'Theft, major collision above excess',
              notCovered: 'Tyres, glass, underbody',
              perDayMinor: 0,
              excessMinor: 1500000,
            },
            {
              publicId: 'standard',
              tier: 2,
              name: 'Reduced Excess',
              summary: 'Covers minor scratches and dents.',
              covered: 'Body panels, collision above reduced excess',
              notCovered: 'Underbody and misfuelling',
              perDayMinor: 35000,
              excessMinor: 500000,
            },
            {
              publicId: 'premium',
              tier: 3,
              name: 'Zero Excess',
              summary: 'Complete peace of mind with roadside help.',
              covered: 'Zero excess, glass, tyres, 24/7 assist',
              notCovered: 'Negligence or DUI',
              perDayMinor: 75000,
              excessMinor: 0,
            },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <VehicleTile
            href="/_kit"
            vehicle={{
              slug: 'honda-city-zx',
              make: 'Honda',
              model: 'City',
              variant: 'ZX CVT',
              year: 2025,
              plate: 'KA 01 AB 9104',
              category: 'sedan',
              transmission: 'automatic',
              fuelType: 'petrol',
              seats: 5,
              paintName: 'Obsidian Blue',
              paintHex: 'var(--surface-raised)',
              totalMinor: 924000,
              dailyMinor: 308000,
              days: 3,
              availabilityLabel: 'Free for dates',
            }}
          />

          <div className="space-y-4">
            <SpecSheet
              rows={[
                { label: 'Transmission', value: 'CVT Automatic' },
                { label: 'Daily allowance', value: '250 km / day' },
                { label: 'Refundable deposit', value: '₹10,000' },
                { label: 'Sample total', value: formatMoney(1175988, 'INR', 'en-IN') },
              ]}
            />
            <MoneyText amountMinor={1175988} size="large" className="text-3 text-petrol-800" />
            <Skeleton className="h-10 w-48" />
          </div>
        </div>

        <TripTicket
          trip={{
            code: 'KB7-4Q2',
            vehicleTitle: 'Honda City ZX CVT',
            vehiclePlate: 'KA 01 AB 9104',
            paintHex: 'var(--surface-raised)',
            pickupLabel: 'Fri 14 Nov, 10:00',
            returnLabel: 'Mon 17 Nov, 10:00',
            branchName: 'Indiranagar Hub',
            status: 'confirmed',
            totalMinor: 1175988,
          }}
        />
      </section>
    </main>
  );
}
