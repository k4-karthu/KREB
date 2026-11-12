import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  base: { service: 'kerb' },
  redact: {
    paths: ['password', 'token', 'licenceNumber', 'authorization', 'cookie'],
    censor: '[REDACTED]',
  },
});

export function childLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
