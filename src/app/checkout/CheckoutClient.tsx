'use client';

import { ArrowRight, CheckCircle2, CreditCard, Lock, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { QuoteLineItem } from '@/domain/pricing/pricing';
import { authClient } from '@/server/auth-client';
import { Stepper } from '@/ui/components/Stepper';
import { Button } from '@/ui/primitives/Button';
import { MoneyText } from '@/ui/primitives/MoneyText';
import { Plate } from '@/ui/primitives/Plate';

const STEPS = [
  { id: 'trip', label: 'Trip review' },
  { id: 'you', label: 'Driver & KYC' },
  { id: 'pay', label: 'Pay & lock' },
];

export function CheckoutClient({
  quotePublicId,
  vehicleTitle,
  plate,
  paintHex,
  branchName,
  startAt,
  endAt,
  totalMinor,
  depositMinor,
  lines,
  actor,
  profile,
  licenceStatus,
}: {
  quotePublicId: string;
  vehicleTitle: string;
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
}) {
  const router = useRouter();
  const [step, setStep] = useState(actor ? 1 : 0);
  const [isSignedIn, setIsSignedIn] = useState(Boolean(actor));

  // Inline auth state if guest
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [fullName, setFullName] = useState(actor?.name ?? '');
  const [email, setEmail] = useState(actor?.email ?? '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(profile?.phone ?? '+91 98450 ');
  const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth ?? '1994-06-15');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('card');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => `chk_${quotePublicId}_${Date.now()}`);

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
      setStep(2);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmPayment() {
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
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <Stepper steps={STEPS} currentIndex={step} />

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          {error && (
            <p className="rounded-s border border-stop-600 bg-stop-100 px-3 py-2 text-sm text-stop-600">
              {error}
            </p>
          )}

          {step === 0 && (
            <section className="space-y-4 rounded-m border border-line bg-surface p-6">
              <h1 className="font-display text-xl font-bold text-ink">Confirm your trip details</h1>
              <div className="grid gap-4 rounded-s border border-line bg-surface-subtle p-4 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-xs text-ink-muted">Pick-up</div>
                  <div className="font-semibold text-ink">{fmtDate(startAt)}</div>
                  <div className="text-xs text-ink-muted">{branchName}</div>
                </div>
                <div>
                  <div className="text-xs text-ink-muted">Return</div>
                  <div className="font-semibold text-ink">{fmtDate(endAt)}</div>
                  <div className="text-xs text-ink-muted">{branchName}</div>
                </div>
              </div>
              <Button type="button" size="lg" onClick={() => setStep(1)}>
                <span>Continue to driver details</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-4 rounded-m border border-line bg-surface p-6">
              <h2 className="font-display text-xl font-bold text-ink">Driver verification</h2>

              {!isSignedIn ? (
                <form onSubmit={handleInlineAuth} className="space-y-3">
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setAuthMode('signup')}
                      className={`rounded-s px-3 py-1.5 font-medium ${
                        authMode === 'signup' ? 'bg-ink text-surface' : 'bg-surface-subtle text-ink'
                      }`}
                    >
                      New driver
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className={`rounded-s px-3 py-1.5 font-medium ${
                        authMode === 'login' ? 'bg-ink text-surface' : 'bg-surface-subtle text-ink'
                      }`}
                    >
                      Returning driver
                    </button>
                  </div>

                  {authMode === 'signup' && (
                    <label className="block space-y-1 text-xs font-medium text-ink">
                      <span>Full name (as on driving licence)</span>
                      <input
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-10 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm"
                      />
                    </label>
                  )}

                  <label className="block space-y-1 text-xs font-medium text-ink">
                    <span>Email address</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm"
                    />
                  </label>

                  <label className="block space-y-1 text-xs font-medium text-ink">
                    <span>Password (min 8 characters)</span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm"
                    />
                  </label>

                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Signing in...' : 'Continue'}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-s border border-go-600 bg-go-100 p-3 text-xs text-petrol-800">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="h-4 w-4" /> Signed in as {actor?.email ?? email}
                    </span>
                    <span>Licence: {licenceStatus ?? 'Upload after booking in Account'}</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs font-medium text-ink">
                      <span>Mobile phone</span>
                      <input
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-10 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm"
                      />
                    </label>
                    <label className="space-y-1 text-xs font-medium text-ink">
                      <span>Date of birth</span>
                      <input
                        type="date"
                        required
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="h-10 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm"
                      />
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => setStep(0)}>
                      Back
                    </Button>
                    <Button type="button" onClick={() => setStep(2)}>
                      Continue to payment
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4 rounded-m border border-line bg-surface p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-ink">
                  Payment & security deposit hold
                </h2>
                <Lock className="h-4 w-4 text-ink-muted" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex items-center gap-3 rounded-s border p-3 text-left text-sm ${
                    paymentMethod === 'card'
                      ? 'border-petrol-600 bg-petrol-100 text-petrol-900'
                      : 'border-line bg-surface-subtle text-ink'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <div>
                    <div className="font-semibold">Card / NetBanking</div>
                    <div className="text-xs text-ink-muted">Instant hold + receipt</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`flex items-center gap-3 rounded-s border p-3 text-left text-sm ${
                    paymentMethod === 'upi'
                      ? 'border-petrol-600 bg-petrol-100 text-petrol-900'
                      : 'border-line bg-surface-subtle text-ink'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <div>
                    <div className="font-semibold">UPI Autopay</div>
                    <div className="text-xs text-ink-muted">Zero convenience fee</div>
                  </div>
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  type="button"
                  size="lg"
                  disabled={submitting}
                  onClick={() => void handleConfirmPayment()}
                >
                  {submitting ? 'Confirming booking...' : 'Pay & confirm booking'}
                </Button>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4 rounded-m border border-line bg-surface p-5 lg:col-span-5 h-fit">
          <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
            <div>
              <div className="font-semibold text-ink">{vehicleTitle}</div>
              <div className="text-xs text-ink-muted">{branchName}</div>
            </div>
            <Plate code={plate} paintHex={paintHex} size="sm" />
          </div>

          <div className="space-y-2 text-xs">
            {lines.map((line, i) => (
              <div key={`${line.kind}-${i}`} className="flex items-center justify-between">
                <span className="text-ink-muted">{line.label}</span>
                <MoneyText amountMinor={line.amountMinor} className="font-medium text-ink" />
              </div>
            ))}
          </div>

          <div className="border-t border-line pt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-ink">Total due now</span>
              <MoneyText amountMinor={totalMinor} size="large" className="text-2xl text-ink" />
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Plus <MoneyText amountMinor={depositMinor} /> refundable security hold released after
              return.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
