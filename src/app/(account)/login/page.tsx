'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, Suspense, useState } from 'react';
import { BRAND } from '@/config/brand';
import { authClient } from '@/server/auth-client';
import { Button } from '@/ui/primitives/Button';
import { Field, Input } from '@/ui/primitives/Field';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/trips';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (res.error) {
        setError('Invalid email or password. Check your details and try again.');
        return;
      }
      router.push(nextUrl);
      router.refresh();
    } catch {
      setError('Could not sign in right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main-content" className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8">
        <Link href="/" className="font-display text-h3 font-bold text-accent">
          {BRAND.name}
        </Link>
        <h1 className="mt-4 font-display text-h1 font-bold text-text-1">Sign in to your account</h1>
        <p className="mt-1 text-body-s text-text-2">
          Manage upcoming trips, upload your driving licence, and view receipts.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-l border border-border bg-surface p-8 shadow-e2"
      >
        {error && (
          <div
            role="alert"
            className="rounded-s border border-danger bg-danger-subtle px-3 py-2 text-caption text-danger"
          >
            {error}
          </div>
        )}

        <Field id="login-email" label="Email address" required>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="meera@kerb.local"
          />
        </Field>

        <Field id="login-password" label="Password" required>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Button type="submit" variant="primary" className="w-full" loading={loading}>
          Sign in
        </Button>

        <div className="flex items-center justify-between pt-2 text-caption text-text-2">
          <Link href="/signup" className="text-accent hover:underline">
            Create an account
          </Link>
          <Link href="/admin/login" className="text-accent hover:underline">
            Staff sign in
          </Link>
        </div>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-4 py-16">
          <div className="h-64 rounded-l border border-border bg-surface p-8 shadow-e2" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
