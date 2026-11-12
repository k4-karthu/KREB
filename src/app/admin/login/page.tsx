'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { BRAND } from '@/config/brand';
import { authClient } from '@/server/auth-client';
import { Button } from '@/ui/primitives/Button';
import { Field, Input } from '@/ui/primitives/Field';
import { Plate } from '@/ui/primitives/Plate';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (needsTotp) {
        const res = await authClient.twoFactor.verifyTotp({ code: totpCode.trim() });
        if (res.error) {
          setError('Invalid authentication code. Check your authenticator app and try again.');
          return;
        }
        router.push('/admin');
        router.refresh();
        return;
      }

      const res = await authClient.signIn.email({
        email: email.trim(),
        password,
      });

      if (res.error) {
        setError('Invalid credentials. Check your staff email and password.');
        return;
      }

      const data = res.data as { twoFactorRedirect?: boolean } | null;
      if (data?.twoFactorRedirect) {
        setNeedsTotp(true);
        return;
      }

      // Verify staff role server-side before navigating to /admin
      const roleCheck = await fetch('/api/admin/me');
      if (!roleCheck.ok) {
        await authClient.signOut();
        setError('This account does not have staff access to the operations desk.');
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('Could not complete staff sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main-content" className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 space-y-2">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display-wide text-2 text-petrol-800">
            {BRAND.name}
          </Link>
          <Plate code="OPS DESK" size="sm" />
        </div>
        <h1 className="font-display-wide text-3 text-petrol-800">Staff operations sign in</h1>
        <p className="text-0 text-stone-500">
          Authorized fleet managers, counter agents, and owners only.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-m border border-stone-200 bg-sheet p-6"
      >
        {error && (
          <div
            role="alert"
            className="rounded-m border border-stop-600 bg-stop-100 px-3 py-2 text-m1 text-stop-600"
          >
            {error}
          </div>
        )}

        {!needsTotp ? (
          <>
            <Field id="admin-email" label="Staff email" required>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dev@kerb.local"
              />
            </Field>

            <Field id="admin-password" label="Password" required>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </>
        ) : (
          <Field
            id="admin-totp"
            label="Authenticator code"
            hint="Enter the 6-digit TOTP code from your authenticator."
            required
          >
            <Input
              id="admin-totp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
            />
          </Field>
        )}

        <Button type="submit" variant="primary" className="w-full" loading={loading}>
          {needsTotp ? 'Verify code' : 'Sign in to operations'}
        </Button>

        <div className="pt-2 text-m1 text-stone-500">
          <Link href="/" className="text-petrol-600 underline underline-offset-4">
            Return to public site
          </Link>
        </div>
      </form>
    </main>
  );
}
