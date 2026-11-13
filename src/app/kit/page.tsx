'use client';

import { useState } from 'react';
import { formatMoney } from '@/domain/shared/money';
import { Plate } from '@/ui/data/Plate';
import { Price } from '@/ui/data/Price';
import { ProtectionCards } from '@/ui/data/ProtectionCards';
import { Skeleton } from '@/ui/data/Skeleton';
import { SpecSheet } from '@/ui/data/SpecSheet';
import { StatusBadge } from '@/ui/data/StatusBadge';
import { Stepper } from '@/ui/data/Stepper';
import { TripTicket } from '@/ui/data/TripTicket';
import { VehicleTile } from '@/ui/data/VehicleTile';
import { LaneLine } from '@/ui/motion/LaneLine';
import { useReducedMotionToggle } from '@/ui/motion/MotionProvider';
import { PlateStamp } from '@/ui/motion/PlateStamp';
import { RollingNumber } from '@/ui/motion/RollingNumber';
import { Dialog } from '@/ui/overlays/Dialog';
import { Button } from '@/ui/primitives/Button';
import { Field, Input, Select } from '@/ui/primitives/Field';

export default function KitPage() {
  const { forcedReduced, setForcedReduced } = useReducedMotionToggle();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('standard');
  const [rollingPrice, setRollingPrice] = useState(924000);
  const [stepIdx, setStepIdx] = useState(1);

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 space-y-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-h1 font-bold text-text-1">Kerb Design Kit</h1>
          <p className="text-body-s text-text-2 mt-1">
            Living token and component reference built against Swiss minimalism standards.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => setForcedReduced(!forcedReduced)}>
            {forcedReduced ? 'Reduced motion: On' : 'Reduced motion: Off'}
          </Button>
        </div>
      </header>

      <section aria-labelledby="kit-buttons" className="space-y-4">
        <h2 id="kit-buttons" className="text-h2 font-bold text-text-1">
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
        <h2 id="kit-motion" className="text-h2 font-bold text-text-1">
          Motion Moments
        </h2>
        <div className="space-y-4 rounded-m border border-border bg-surface p-6 shadow-e1">
          <div>
            <p className="text-caption text-text-2 mb-2">LaneLine draw-in reveal</p>
            <LaneLine mode="reveal" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div>
              <p className="text-caption text-text-2">Rolling tabular figure</p>
              <RollingNumber
                value={rollingPrice}
                format={(n) => formatMoney(n, 'INR', 'en-IN')}
                className="font-display text-h3 font-bold text-text-1"
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
            <p className="text-caption text-text-2 mb-2">Confirmation PlateStamp</p>
            <PlateStamp>
              <Plate code="KB9-2X7" size="lg" />
            </PlateStamp>
          </div>
        </div>
      </section>

      <section aria-labelledby="kit-forms" className="space-y-4">
        <h2 id="kit-forms" className="text-h2 font-bold text-text-1">
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
            currentStep={stepIdx}
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
          <p className="text-body-s text-text-1">
            Includes 250 km per day. Extra distance is billed at ₹14 per km at check-in.
          </p>
        </Dialog>
      </section>

      <section aria-labelledby="kit-rental" className="space-y-6">
        <h2 id="kit-rental" className="text-h2 font-bold text-text-1">
          Rental Components
        </h2>

        <ProtectionCards
          selectedTierId={selectedPlan}
          onSelectTier={setSelectedPlan}
          tiers={[
            {
              id: 'basic',
              name: 'Basic Protection',
              summary: 'Standard third-party and collision cover.',
              dailyMinor: 0,
              excessMinor: 1500000,
              features: [
                { text: 'Theft & major collision', included: true },
                { text: 'Glass and tyres covered', included: false },
              ],
            },
            {
              id: 'standard',
              name: 'Reduced Excess',
              summary: 'Covers minor scratches and dents.',
              dailyMinor: 35000,
              excessMinor: 500000,
              features: [
                { text: 'Theft & major collision', included: true },
                { text: 'Minor scratches and dents', included: true },
              ],
            },
            {
              id: 'premium',
              name: 'Zero Excess',
              summary: 'Complete peace of mind with roadside help.',
              dailyMinor: 75000,
              excessMinor: 0,
              features: [
                { text: 'Zero customer liability', included: true },
                { text: '24/7 roadside assistance', included: true },
              ],
            },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <VehicleTile
            href="/kit"
            vehicle={{
              slug: 'honda-city-zx',
              make: 'Honda',
              model: 'City',
              variant: 'ZX CVT',
              category: 'sedan',
              transmission: 'automatic',
              fuelType: 'petrol',
              seats: 5,
              dailyMinor: 308000,
              status: 'ready',
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
            <Price amountMinor={1175988} size="xl" className="text-text-1" />
            <Skeleton className="h-10 w-48" />
          </div>
        </div>

        <TripTicket
          trip={{
            code: 'KB7-4Q2',
            vehicleTitle: 'Honda City ZX CVT',
            vehiclePlate: 'KA 01 AB 9104',
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
