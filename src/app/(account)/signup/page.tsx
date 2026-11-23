'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { BRAND } from '@/config/brand';
import { authClient } from '@/server/auth-client';
import { Button } from '@/ui/primitives/Button';
import { Field, Input } from '@/ui/primitives/Field';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      if (res.error) {
        setError(res.error.message ?? 'Could not create account. Check your details.');
        return;
      }
      router.push('/account');
      router.refresh();
    } catch {
      setError('Could not create your account right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main-content" className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 font-display text-h3 font-bold text-text-1 hover:text-racing-green transition-colors"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-xs bg-racing-green text-on-racing-green text-caption font-technical font-bold">
            K
          </span>
          <span>{BRAND.name}</span>
        </Link>
        <h1 className="mt-4 font-display text-h1 font-bold text-text-1">Create your account</h1>
        <p className="mt-1 text-body-s text-text-2">
          Verify your driving licence once and reuse it on future rentals.
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

        <Field id="signup-name" label="Full name (as on driving licence)" required>
          <Input
            id="signup-name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Meera Krishnan"
          />
        </Field>

        <Field id="signup-email" label="Email address" required>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="meera@example.com"
          />
        </Field>

        <Field id="signup-password" label="Password" hint="At least 8 characters." required>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Button type="submit" variant="racing" className="w-full" loading={loading}>
          Create account
        </Button>

        <div className="pt-2 text-center text-caption text-text-2">
          Already have an account?{' '}
          <Link href="/login" className="text-racing-green hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </form>
    </main>
  );
}
