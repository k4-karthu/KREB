import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { twoFactor } from 'better-auth/plugins';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getEnv } from '@/config/env';
import { getWriteConnection } from '@/db/client';
import * as schema from '@/db/schema/auth';
import { DomainError } from '@/domain/shared/errors';
import { type AuthActor, type Capability, can, isStaffRole, type Role } from './permissions';

let authInstance: ReturnType<typeof createAuth> | null = null;

function createAuth() {
  const env = getEnv();
  const { db } = getWriteConnection();

  return betterAuth({
    secret: env.AUTH_SECRET,
    baseURL: env.APP_URL,
    trustedOrigins: env.AUTH_TRUSTED_ORIGINS.split(',').map((s) => s.trim()),
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        twoFactor: schema.twoFactor,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      password: {
        hash: async (password) => argon2Hash(password),
        verify: async ({ hash, password }) => argon2Verify(hash, password),
      },
    },
    user: {
      additionalFields: {
        role: {
          type: 'string',
          required: false,
          defaultValue: 'customer',
          input: false,
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 20,
    },
    plugins: [
      twoFactor({
        issuer: 'Kerb',
      }),
      nextCookies(),
    ],
  });
}

export function getAuth() {
  if (!authInstance) {
    authInstance = createAuth();
  }
  return authInstance;
}

export async function getServerActor(): Promise<AuthActor | null> {
  const auth = getAuth();
  const hdrs = await headers();
  const sessionData = await auth.api.getSession({ headers: hdrs });
  if (!sessionData?.user) return null;

  const u = sessionData.user as {
    id: string;
    email: string;
    name: string;
    role?: string;
  };
  const role: Role = isStaffRole(u.role) ? u.role : 'customer';
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role,
  };
}

export async function requireCustomerOrStaff(): Promise<AuthActor> {
  const actor = await getServerActor();
  if (!actor) {
    throw new DomainError('UNAUTHORIZED', 'Please sign in to continue.', 401);
  }
  return actor;
}

export async function requireStaffCapability(capability: Capability): Promise<AuthActor> {
  const actor = await getServerActor();
  if (!actor) {
    throw new DomainError('UNAUTHORIZED', 'Admin sign-in required.', 401);
  }
  if (!can(actor, capability)) {
    throw new DomainError('FORBIDDEN', 'You do not have permission for this action.', 403);
  }
  return actor;
}

export async function requireStaffPage(
  capability: Capability = 'admin.access',
): Promise<AuthActor> {
  const actor = await getServerActor();
  if (!actor || !isStaffRole(actor.role) || !can(actor, capability)) {
    redirect('/admin/login');
  }
  return actor;
}
