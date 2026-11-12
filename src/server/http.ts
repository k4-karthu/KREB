import { NextResponse } from 'next/server';
import { DomainError } from '@/domain/shared/errors';
import { logger } from './logger';

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof DomainError) {
    return NextResponse.json(
      {
        error: err.message,
        code: err.code,
        fieldErrors: err.fieldErrors ?? null,
      },
      { status: err.statusCode },
    );
  }
  logger.error({ err }, 'Unhandled API error');
  return NextResponse.json(
    {
      error: 'Something went wrong on our side. Please try again.',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 },
  );
}
