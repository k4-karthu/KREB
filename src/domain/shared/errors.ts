export type DomainErrorCode =
  | 'VEHICLE_UNAVAILABLE'
  | 'QUOTE_EXPIRED'
  | 'QUOTE_TAMPERED'
  | 'ELIGIBILITY_FAILED'
  | 'INVALID_TRANSITION'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'BUSY'
  | 'RATE_LIMITED'
  | 'PAYMENT_FAILED';

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly statusCode: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    code: DomainErrorCode,
    message: string,
    statusCode = 400,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
  }
}
