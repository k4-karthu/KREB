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
        <Link href="/" className="font-display-wide text-2 text-petrol-800">
          {BRAND.name}
        </Link>
        <h1 className="mt-4 font-display-wide text-3 text-petrol-800">Create your account</h1>
        <p className="mt-1 text-0 text-stone-500">
          Verify your driving licence once and reuse it on future rentals.
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Button type="submit" variant="primary" className="w-full" loading={loading}>
          Create account
        </Button>

        <p className="pt-2 text-m1 text-stone-500">
          Already registered?{' '}
          <Link href="/login" className="text-petrol-600 underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
