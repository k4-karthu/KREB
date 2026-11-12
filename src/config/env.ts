import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_PATH: z.string().min(1).default('./data/kerb.db'),
  UPLOADS_PATH: z.string().min(1).default('./data'),
  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET must be at least 32 characters')
    .default('dev-kerb-auth-secret-change-before-production-32bytes'),
  AUTH_TRUSTED_ORIGINS: z.string().default('http://localhost:3000'),
  QUOTE_SIGNING_KEY: z
    .string()
    .min(32, 'QUOTE_SIGNING_KEY must be at least 32 characters')
    .default('dev-kerb-quote-signing-key-change-in-production-32b'),
  LICENCE_ENC_KEY_V1: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'LICENCE_ENC_KEY_V1 must be 64 hex chars (32 bytes)')
    .default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  LICENCE_ENC_ACTIVE_VERSION: z.coerce.number().int().min(1).default(1),
  PAYMENT_PROVIDER: z.enum(['fake', 'razorpay', 'stripe']).default('fake'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  MAIL_PROVIDER: z.enum(['console', 'resend', 'smtp']).default('console'),
  RESEND_API_KEY: z.string().optional(),
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default('Kerb Desk <desk@kerb.local>'),
  DEFAULT_TIMEZONE: z.string().default('Asia/Kolkata'),
  DEFAULT_CURRENCY: z.string().length(3).default('INR'),
  BRAND_NAME: z.string().optional(),
});

export type AppEnv = z.infer<typeof EnvSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${formatted}`);
  }
  if (parsed.data.NODE_ENV === 'production') {
    if (
      parsed.data.AUTH_SECRET.startsWith('dev-') ||
      parsed.data.QUOTE_SIGNING_KEY.startsWith('dev-')
    ) {
      throw new Error('Production environment cannot use dev fallback signing secrets.');
    }
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}

export function resetEnvCache(): void {
  cachedEnv = null;
}
