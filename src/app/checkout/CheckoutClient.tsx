'use client';

import {
  CheckCircle,
  CreditCard,
  IdentificationCard,
  Lock,
  ShieldCheck,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import type { QuoteLineItem } from '@/domain/pricing/pricing';
import { authClient } from '@/server/auth-client';
import { Plate } from '@/ui/data/Plate';
import { Price } from '@/ui/data/Price';
import { ProtectionCards, type ProtectionTier } from '@/ui/data/ProtectionCards';
import { QuotePanel } from '@/ui/data/QuotePanel';
import { StatusBadge } from '@/ui/data/StatusBadge';
import { Stepper } from '@/ui/data/Stepper';
import { Button } from '@/ui/primitives/Button';
import { Checkbox } from '@/ui/primitives/Checkbox';
import { Dropzone } from '@/ui/primitives/Dropzone';
import { Radio, RadioGroup } from '@/ui/primitives/Radio';
import { TextField } from '@/ui/primitives/TextField';

const CHECKOUT_STEPS = [
  { id: 'driver', label: 'Driver Details', description: 'Licence & contact' },
  { id: 'protection', label: 'Protection & Addons', description: 'Excess & options' },
  { id: 'payment', label: 'Payment', description: 'Instant hold' },
  { id: 'confirmation', label: 'Confirmation', description: 'Official slip' },
];

const PROTECTION_TIERS: ProtectionTier[] = [
  {
    id: 'basic',
    name: 'Basic Cover',
    summary: 'Standard third-party liability with statutory protection',
    dailyMinor: 0,
    excessMinor: 2500000,
    features: [
      { text: 'Third party property damage', included: true },
      { text: 'Mandatory third party liability', included: true },
      { text: 'Zero security excess', included: false },
      { text: 'Tyre and windshield waiver', included: false },
    ],
  },
  {
    id: 'standard',
    name: 'Standard Cover',
    summary: 'Reduced excess and comprehensive road incident cover',
    dailyMinor: 49900,
    excessMinor: 500000,
    recommended: true,
    features: [
      { text: 'Third party property damage', included: true },
      { text: 'Collision damage waiver', included: true },
      { text: 'Tyre, rim and windshield cover', included: true },
      { text: '24/7 on-road mechanical assistance', included: true },
    ],
  },
  {
    id: 'premium',
    name: 'Zero Excess Cover',
    summary: 'Total peace of mind with complete liability waiver',
    dailyMinor: 99900,
    excessMinor: 0,
    features: [
      { text: 'Zero excess liability on damage', included: true },
      { text: 'Tyre, rim and windshield cover', included: true },
      { text: 'Personal accident cover', included: true },
      { text: 'Priority replacement vehicle', included: true },
    ],
  },
];

export interface CheckoutClientProps {
  quotePublicId: string;
  vehicleTitle: string;
  category: string;
  plate: string;
  paintHex: string;
  branchName: string;
  startAt: number;
  endAt: number;
  totalMinor: number;
  depositMinor: number;
  lines: QuoteLineItem[];
  actor: { id: string; name: string; email: string } | null;
  profile: { phone: string | null; dateOfBirth: string | null } | null;
  licenceStatus: string | null;
  licenceLast4: string | null;
}

export function CheckoutClient({
  quotePublicId,
  vehicleTitle,
  category,
  plate,
  branchName,
  startAt,
  endAt,
  totalMinor,
  depositMinor,
  lines,
  actor,
  profile,
  licenceStatus,
  licenceLast4,
}: CheckoutClientProps) {
  const router = useRouter();
  const rawIdem = useId();
  const [step, setStep] = useState(actor ? 1 : 0);
  const [isSignedIn, setIsSignedIn] = useState(Boolean(actor));

  // Inline auth state
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [fullName, setFullName] = useState(actor?.name ?? '');
  const [email, setEmail] = useState(actor?.email ?? '');
  const [password, setPassword] = useState('');

  // Driver details state
  const [phone, setPhone] = useState(profile?.phone ?? '+91 98450 12345');
  const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth ?? '1995-08-20');

  // Protection & Addons state
  const [selectedTierId, setSelectedTierId] = useState('standard');
  const [addonChildSeat, setAddonChildSeat] = useState(false);
  const [addonAddlDriver, setAddonAddlDriver] = useState(false);
  const [addonFastag, setAddonFastag] = useState(false);

  // KYC Licence state
  const [licenceNumber, setLicenceNumber] = useState('');
  const [licenceExpiry, setLicenceExpiry] = useState('2032-12-31');
  const [licenceFile, setLicenceFile] = useState<File | null>(null);
  const [licenceUploaded, setLicenceUploaded] = useState(Boolean(licenceStatus));
  const [uploadingLicence, setUploadingLicence] = useState(false);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('card');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('888');
  const [cardHolder, setCardHolder] = useState(actor?.name || 'Rahul Sharma');
  const [upiId, setUpiId] = useState('driver@okhdfcbank');
  const [termsAgreed, setTermsAgreed] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(
    () => `chk_${quotePublicId}_${Date.now()}_${rawIdem.replace(/[^a-zA-Z0-9]/g, '')}`,
  );

  const rentalDays = Math.max(1, Math.round((endAt - startAt) / (24 * 3600 * 1000)));

  // Base rate calculation
  const baseRateLine = lines.find((l) => l.kind === 'base') ?? lines[0];
  const baseRentalMinor = baseRateLine?.amountMinor ?? Math.round(totalMinor * 0.8);
  const dailyRateMinor = Math.round(baseRentalMinor / rentalDays);

  // Protection plan calculation
  const selectedTier = PROTECTION_TIERS.find((t) => t.id === selectedTierId) ??
    PROTECTION_TIERS[1] ?? {
      id: 'standard',
      name: 'Standard Cover',
      summary: 'Reduced excess and comprehensive road incident cover',
      dailyMinor: 49900,
      excessMinor: 500000,
      features: [],
    };
  const protectionDailyRate = selectedTier.dailyMinor;
  const protectionTotalMinor = protectionDailyRate * rentalDays;

  // Addons list for QuotePanel
  const activeAddOns: Array<{
    id: string;
    label: string;
    description?: string;
    amountMinor: number;
  }> = [];

  if (protectionDailyRate > 0) {
    activeAddOns.push({
      id: 'protection',
      label: selectedTier.name,
      description: selectedTier.summary,
      amountMinor: protectionTotalMinor,
    });
  }

  if (addonChildSeat) {
    activeAddOns.push({
      id: 'child_seat',
      label: 'Child safety seat',
      description: 'ISOFIX compliant infant seat',
      amountMinor: 29900 * rentalDays,
    });
  }

  if (addonAddlDriver) {
    activeAddOns.push({
      id: 'addl_driver',
      label: 'Additional authorized driver',
      description: 'Verified second pilot for long stretches',
      amountMinor: 39900 * rentalDays,
    });
  }

  if (addonFastag) {
    activeAddOns.push({
      id: 'fastag',
      label: 'Pre-loaded FASTag toll pass',
      description: 'Express highway toll electronic lane pass',
      amountMinor: 50000,
    });
  }

  const addOnsTotalMinor = activeAddOns.reduce((sum, a) => sum + a.amountMinor, 0);
  const taxableSubtotalMinor = baseRentalMinor + addOnsTotalMinor;
  const taxesMinor = Math.round(taxableSubtotalMinor * 0.18);
  const currentDepositMinor =
    selectedTier.excessMinor === 0 ? 0 : selectedTier.excessMinor <= 500000 ? 500000 : depositMinor;

  const fmtDate = (ms: number) =>
    new Date(ms).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    });

  async function handleInlineAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (authMode === 'signup') {
        const res = await authClient.signUp.email({
          email,
          password,
          name: fullName,
        });
        if (res.error) throw new Error(res.error.message ?? 'Sign-up failed');
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message ?? 'Sign-in failed');
      }
      setIsSignedIn(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLicenceUpload() {
    if (!licenceFile || !licenceNumber) {
      setError('Please provide a driving licence number and document image.');
      return;
    }
    setUploadingLicence(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set('licenceNumber', licenceNumber);
      formData.set('issuingRegion', 'KA');
      formData.set('expiresOn', licenceExpiry);
      formData.set('frontFile', licenceFile);

      const res = await fetch('/api/account/licence', {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Licence upload failed');
      setLicenceUploaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Licence upload error');
    } finally {
      setUploadingLicence(false);
    }
  }

  async function handleConfirmPayment() {
    if (!termsAgreed) {
      setError('Please accept the rental terms and security deposit hold authorization.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotePublicId,
          phone,
          dateOfBirth,
          paymentMethod,
          idempotencyKey,
        }),
      });
      const data = (await res.json()) as { code?: string; error?: string };
      if (!res.ok || !data.code) {
        throw new Error(data.error ?? 'Payment confirmation failed');
      }
      router.push(`/checkout/confirmed/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      {/* Step Indicator */}
      <div className="rounded-m border border-border-subtle bg-surface p-5 shadow-e0">
        <Stepper steps={CHECKOUT_STEPS} currentStep={step} />
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Main Step Flow Content */}
        <div className="space-y-6 lg:col-span-7">
          {error && (
            <div
              role="alert"
              className="rounded-s border border-danger/30 bg-danger-subtle p-3.5 text-body-s font-medium text-danger"
            >
              {error}
            </div>
          )}

          {/* STEP 0: Driver Details & Account */}
          {step === 0 && (
            <section className="space-y-6 rounded-m border border-border bg-surface p-6 shadow-e1">
              <div>
                <h2 className="font-display text-h3 font-semibold text-text-1">
                  Driver profile & verification
                </h2>
                <p className="mt-1 text-body-s text-text-2">
                  Sign in or create an account to associate your driving credentials with this
                  reservation.
                </p>
              </div>

              {!isSignedIn ? (
                <form onSubmit={handleInlineAuth} className="space-y-4">
                  <div className="flex gap-2 border-b border-border-subtle pb-3">
                    <Button
                      type="button"
                      size="sm"
                      variant={authMode === 'signup' ? 'primary' : 'secondary'}
                      onClick={() => setAuthMode('signup')}
                    >
                      New driver
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={authMode === 'login' ? 'primary' : 'secondary'}
                      onClick={() => setAuthMode('login')}
                    >
                      Returning driver
                    </Button>
                  </div>

                  {authMode === 'signup' && (
                    <TextField
                      label="Full name (as on driving licence)"
                      placeholder="e.g. Rahul Sharma"
                      required
                      value={fullName}
                      onChange={setFullName}
                    />
                  )}

                  <TextField
                    label="Email address"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={setEmail}
                  />

                  <TextField
                    label="Password"
                    type="password"
                    placeholder="Minimum 8 characters"
                    required
                    value={password}
                    onChange={setPassword}
                  />

                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? 'Authenticating...' : 'Continue to driver credentials'}
                  </Button>
                </form>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between rounded-s border border-border-subtle bg-surface-sunken p-3.5">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle size={20} weight="fill" className="text-success" />
                      <div>
                        <div className="text-body-s font-semibold text-text-1">
                          Signed in as {actor?.name || fullName}
                        </div>
                        <div className="text-label-s text-text-3">{actor?.email || email}</div>
                      </div>
                    </div>
                    <StatusBadge
                      status={licenceUploaded ? 'verified' : 'pending'}
                      label={licenceUploaded ? 'Licence on file' : 'Licence pending'}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      label="Mobile phone number"
                      placeholder="+91 98765 43210"
                      required
                      value={phone}
                      onChange={setPhone}
                    />
                    <TextField
                      label="Date of birth"
                      type="date"
                      required
                      value={dateOfBirth}
                      onChange={setDateOfBirth}
                    />
                  </div>

                  {/* KYC Licence Dropzone */}
                  <div className="space-y-3 rounded-s border border-border-subtle bg-surface-sunken/40 p-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-label-m font-semibold text-text-1">
                        <IdentificationCard size={18} className="text-accent" />
                        Driving licence upload (KYC)
                      </span>
                      {licenceLast4 && (
                        <span className="text-label-s text-text-3">Ending in {licenceLast4}</span>
                      )}
                    </div>

                    {licenceUploaded ? (
                      <div className="rounded-xs border border-border-subtle bg-surface p-3 text-body-s text-text-2 flex items-center gap-2">
                        <CheckCircle size={18} weight="bold" className="text-success" />
                        <span>Driving licence recorded and queued for automated verification.</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <TextField
                            label="Licence number"
                            placeholder="KA0120220012345"
                            value={licenceNumber}
                            onChange={setLicenceNumber}
                          />
                          <TextField
                            label="Licence expiry date"
                            type="date"
                            value={licenceExpiry}
                            onChange={setLicenceExpiry}
                          />
                        </div>

                        <Dropzone
                          title="Upload driving licence (front)"
                          description="Clear image or scan of Indian driving licence (JPG, PNG or PDF)"
                          acceptedFileTypes={['image/jpeg', 'image/png', 'application/pdf']}
                          onSelectFiles={(files) => {
                            if (files?.[0]) {
                              setLicenceFile(files[0]);
                            }
                          }}
                        />

                        {licenceFile && (
                          <div className="flex items-center justify-between rounded-xs border border-border bg-surface p-2.5 text-body-s">
                            <span className="truncate text-text-1">{licenceFile.name}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={uploadingLicence}
                              onClick={() => void handleLicenceUpload()}
                            >
                              {uploadingLicence ? 'Uploading...' : 'Upload document'}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="button" size="lg" onClick={() => setStep(1)}>
                      Continue to protection and add-ons
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* STEP 1: Protection & Addons */}
          {step === 1 && (
            <section className="space-y-6 rounded-m border border-border bg-surface p-6 shadow-e1">
              <div>
                <h2 className="font-display text-h3 font-semibold text-text-1">
                  Choose your protection plan
                </h2>
                <p className="mt-1 text-body-s text-text-2">
                  Select your excess liability tier and customize optional equipment for your
                  journey.
                </p>
              </div>

              {/* Protection Cards primitive */}
              <ProtectionCards
                tiers={PROTECTION_TIERS}
                selectedTierId={selectedTierId}
                onSelectTier={setSelectedTierId}
              />

              {/* Optional Trip Addons */}
              <div className="space-y-3 border-t border-border-subtle pt-5">
                <h3 className="font-display text-h4 font-semibold text-text-1">
                  Trip options & accessories
                </h3>
                <div className="space-y-2">
                  <div className="rounded-s border border-border-subtle bg-surface p-3 transition-colors hover:border-border">
                    <Checkbox
                      isSelected={addonChildSeat}
                      onChange={setAddonChildSeat}
                      label="Child safety seat (+₹299/day)"
                      description="Certified rear and front-facing child seat suitable for infants and toddlers."
                    />
                  </div>

                  <div className="rounded-s border border-border-subtle bg-surface p-3 transition-colors hover:border-border">
                    <Checkbox
                      isSelected={addonAddlDriver}
                      onChange={setAddonAddlDriver}
                      label="Additional authorized driver (+₹399/day)"
                      description="Register a secondary licensed driver to take turns on highways."
                    />
                  </div>

                  <div className="rounded-s border border-border-subtle bg-surface p-3 transition-colors hover:border-border">
                    <Checkbox
                      isSelected={addonFastag}
                      onChange={setAddonFastag}
                      label="Pre-loaded FASTag toll pass (+₹500 flat)"
                      description="Automated cashless toll lane clearance with included highway credit balance."
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border-subtle pt-4">
                <Button type="button" variant="secondary" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button type="button" size="lg" onClick={() => setStep(2)}>
                  Continue to payment
                </Button>
              </div>
            </section>
          )}

          {/* STEP 2: Payment */}
          {step === 2 && (
            <section className="space-y-6 rounded-m border border-border bg-surface p-6 shadow-e1">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-h3 font-semibold text-text-1">
                    Payment & security deposit hold
                  </h2>
                  <p className="mt-1 text-body-s text-text-2">
                    Authorized payment method for initial charges and refundable security deposit.
                  </p>
                </div>
                <Lock size={22} weight="bold" className="text-text-3" />
              </div>

              {/* Payment Method Radio Group */}
              <RadioGroup
                label="Select payment method"
                value={paymentMethod}
                onChange={(val) => setPaymentMethod(val as 'card' | 'upi')}
                orientation="vertical"
              >
                <div className="rounded-s border border-border-subtle bg-surface p-3.5 transition-colors hover:border-border">
                  <Radio value="card">
                    <div className="flex items-center gap-3">
                      <CreditCard size={22} weight="bold" className="text-accent shrink-0" />
                      <div>
                        <div className="text-body-s font-semibold text-text-1">
                          Credit or debit card
                        </div>
                        <div className="text-caption text-text-3">
                          Visa, Mastercard, RuPay & Amex with 3D Secure verification
                        </div>
                      </div>
                    </div>
                  </Radio>
                </div>

                <div className="rounded-s border border-border-subtle bg-surface p-3.5 transition-colors hover:border-border">
                  <Radio value="upi">
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={22} weight="bold" className="text-accent shrink-0" />
                      <div>
                        <div className="text-body-s font-semibold text-text-1">UPI Autopay</div>
                        <div className="text-caption text-text-3">
                          Zero processing fee via Google Pay, PhonePe, Paytm, or BHIM
                        </div>
                      </div>
                    </div>
                  </Radio>
                </div>
              </RadioGroup>

              {/* Method Specific Fields */}
              {paymentMethod === 'card' ? (
                <div className="space-y-3 rounded-s border border-border-subtle bg-surface-sunken/40 p-4">
                  <TextField
                    label="Card number"
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={setCardNumber}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label="Expiry date"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={setCardExpiry}
                    />
                    <TextField
                      label="Security code (CVV)"
                      type="password"
                      placeholder="•••"
                      value={cardCvv}
                      onChange={setCardCvv}
                    />
                  </div>
                  <TextField
                    label="Cardholder full name"
                    placeholder="Name as displayed on card"
                    value={cardHolder}
                    onChange={setCardHolder}
                  />
                </div>
              ) : (
                <div className="space-y-3 rounded-s border border-border-subtle bg-surface-sunken/40 p-4">
                  <TextField
                    label="UPI ID / Virtual Payment Address"
                    placeholder="username@okhdfcbank"
                    value={upiId}
                    onChange={setUpiId}
                  />
                  <p className="text-caption text-text-3">
                    An approval notification will be dispatched to your mobile UPI application.
                  </p>
                </div>
              )}

              {/* Commercial payment separation */}
              <div className="rounded-s border border-border bg-surface-sunken p-4 space-y-2.5">
                <div className="flex items-center justify-between text-body-s">
                  <span className="font-semibold text-text-1">
                    Payable now (Rental + 18% GST + Protection)
                  </span>
                  <Price
                    amountMinor={taxableSubtotalMinor + taxesMinor}
                    size="sm"
                    className="font-bold text-accent"
                  />
                </div>
                <div className="flex items-center justify-between text-caption border-t border-border-subtle pt-2">
                  <span className="text-text-2">Refundable security pre-auth hold</span>
                  <span className="text-text-1">
                    <Price
                      amountMinor={currentDepositMinor}
                      size="sm"
                      className="font-semibold text-text-1 mr-1"
                    />
                    (held on card)
                  </span>
                </div>
                <p className="text-caption text-text-3">
                  The security deposit is authorized as a temporary pre-auth hold and released
                  automatically within 5 working days upon clean return walkaround.
                </p>
              </div>

              {/* Rental Terms and Hold Authorization */}
              <div className="rounded-s border border-border-subtle bg-surface p-3.5">
                <Checkbox
                  isSelected={termsAgreed}
                  onChange={setTermsAgreed}
                  label="Accept rental agreement & security deposit authorization"
                  description="I authorize Kerb to process the reservation fee and place a pre-authorized security hold released upon inspection return."
                />
              </div>

              <div className="flex items-center justify-between border-t border-border-subtle pt-4">
                <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  type="button"
                  size="lg"
                  disabled={submitting}
                  onClick={() => void handleConfirmPayment()}
                >
                  {submitting ? 'Confirming booking...' : 'Authorize and confirm booking'}
                </Button>
              </div>
            </section>
          )}
        </div>

        {/* Sticky Live Order Summary with QuotePanel */}
        <aside className="sticky top-6 space-y-4 lg:col-span-5">
          {/* Vehicle summary header */}
          <div className="rounded-l border border-border bg-surface p-5 shadow-e1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-label-s text-text-3 capitalize">{category} category</span>
                <h3 className="font-display text-h3 font-bold text-text-1">{vehicleTitle}</h3>
                <p className="text-body-s text-text-2">{branchName}</p>
              </div>
              <Plate code={plate} size="sm" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border-subtle pt-3 text-body-s">
              <div>
                <span className="block text-label-s text-text-3">Pick-up</span>
                <span className="font-medium text-text-1">{fmtDate(startAt)}</span>
              </div>
              <div>
                <span className="block text-label-s text-text-3">Return</span>
                <span className="font-medium text-text-1">{fmtDate(endAt)}</span>
              </div>
            </div>
          </div>

          {/* Interactive QuotePanel */}
          <QuotePanel
            rentalDays={rentalDays}
            dailyRateMinor={dailyRateMinor}
            addOns={activeAddOns}
            taxesMinor={taxesMinor}
            depositMinor={currentDepositMinor}
          />
        </aside>
      </div>
    </div>
  );
}
