import { Temporal } from '@js-temporal/polyfill';

export type EpochMs = number;

export function nowMs(): EpochMs {
  return Date.now();
}

/**
 * Converts UTC epoch milliseconds to a Temporal.ZonedDateTime in the given IANA timezone.
 */
export function toBranchZoned(epochMs: EpochMs, timeZone: string): Temporal.ZonedDateTime {
  return Temporal.Instant.fromEpochMilliseconds(epochMs).toZonedDateTimeISO(timeZone);
}

/**
 * Parses a branch-local ISO string ('YYYY-MM-DDTHH:mm') into UTC epoch milliseconds.
 */
export function fromBranchLocal(localIso: string, timeZone: string): EpochMs {
  const plain = Temporal.PlainDateTime.from(localIso);
  return plain.toZonedDateTime(timeZone).epochMilliseconds;
}

/**
 * Returns branch-local calendar date 'YYYY-MM-DD'.
 */
export function getBranchLocalDate(epochMs: EpochMs, timeZone: string): string {
  return toBranchZoned(epochMs, timeZone).toPlainDate().toString();
}

/**
 * Returns weekday 0 (Sunday) .. 6 (Saturday) in the branch timezone, matching §7.3 branch_hours.
 */
export function getBranchWeekday(epochMs: EpochMs, timeZone: string): number {
  const isoDay = toBranchZoned(epochMs, timeZone).dayOfWeek; // 1=Mon .. 7=Sun
  return isoDay === 7 ? 0 : isoDay;
}

/**
 * Returns minutes since midnight (0..1439) in the branch timezone.
 */
export function getBranchMinuteOfDay(epochMs: EpochMs, timeZone: string): number {
  const zdt = toBranchZoned(epochMs, timeZone);
  return zdt.hour * 60 + zdt.minute;
}

/**
 * Formats an instant as 'Fri 14 Nov, 10:00' in the branch timezone (§11.12).
 */
export function formatBranchDateTime(epochMs: EpochMs, timeZone: string, locale = 'en-IN'): string {
  const date = new Date(epochMs);
  const datePart = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
  const timePart = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return `${datePart}, ${timePart}`;
}

export function formatBranchDate(epochMs: EpochMs, timeZone: string, locale = 'en-IN'): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(epochMs));
}

export function formatMinutesAsClock(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}
