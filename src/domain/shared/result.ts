export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E = DomainErrorPayload> = Ok<T> | Err<E>;

export interface DomainErrorPayload {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E = DomainErrorPayload>(error: E): Err<E> {
  return { ok: false, error };
}

export function domainErr(
  code: string,
  message: string,
  fieldErrors?: Record<string, string>,
): Err<DomainErrorPayload> {
  return { ok: false, error: { code, message, fieldErrors } };
}
