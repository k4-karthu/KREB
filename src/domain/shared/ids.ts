import { customAlphabet } from 'nanoid';

// 12-character URL-safe public IDs (no ambiguous characters)
const PUBLIC_ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const genPublicId = customAlphabet(PUBLIC_ID_ALPHABET, 12);

// Human booking codes like 'KB7-4Q2' avoiding 0/O/1/I (§7.5)
const BOOKING_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const genPart1 = customAlphabet(BOOKING_CODE_ALPHABET, 1);
const genPart2 = customAlphabet(BOOKING_CODE_ALPHABET, 3);

export function newPublicId(): string {
  return genPublicId();
}

export function newBookingCode(): string {
  return `KB${genPart1()}-${genPart2()}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
