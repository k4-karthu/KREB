'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { BRAND } from '@/config/brand';
import { authClient } from '@/server/auth-client';
import { Plate } from '@/ui/data/Plate';
import { Button } from '@/ui/primitives/Button';
import { TextField } from '@/ui/primitives/TextField';

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-4 py-16 text-text-1">
      <main id="main-content" className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="font-display text-h3 font-bold tracking-tight text-text-1 hover:text-accent transition-colors"
            >
              {BRAND.name}
            </Link>
            <Plate code="OPS DESK" size="sm" />
          </div>
          <h1 className="font-display text-h3 font-bold text-text-1">Staff Operations Sign In</h1>
          <p className="text-body-s text-text-3">
            Authorized fleet managers, counter agents, and operations staff only.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-m border border-border bg-surface p-6 shadow-e1"
        >
          {error && (
            <div
              role="alert"
              className="rounded-xs border border-danger/30 bg-danger-subtle p-3 text-body-s text-danger"
            >
              {error}
            </div>
          )}

          {!needsTotp ? (
            <>
              <TextField
                label="Staff Email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={setEmail}
                placeholder="staff@kerb.local"
              />

              <TextField
                label="Password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={setPassword}
              />
            </>
          ) : (
            <TextField
              label="Authenticator Code"
              description="Enter the 6-digit TOTP code from your mobile authenticator."
              type="text"
              autoComplete="one-time-code"
              required
              value={totpCode}
              onChange={setTotpCode}
            />
          )}

          <Button type="submit" variant="racing" className="w-full mt-2" disabled={loading}>
            {loading ? 'Authenticating...' : needsTotp ? 'Verify Code' : 'Sign In to Operations'}
          </Button>

          <div className="pt-2 text-center text-caption text-text-3">
            <Link href="/" className="hover:text-text-1 hover:underline">
              Return to Public Showroom
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
