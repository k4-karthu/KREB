import crypto from 'node:crypto';
import { getEnv } from '@/config/env';

function getKeyForVersion(version: number): Buffer {
  const env = getEnv();
  if (version === 1) {
    return Buffer.from(env.LICENCE_ENC_KEY_V1, 'hex');
  }
  throw new Error(`Unknown licence encryption key version: ${version}`);
}

/**
 * Encrypts a driver's licence number with AES-256-GCM (§7.6, §10).
 */
export function encryptLicenceNumber(plain: string): {
  ciphertext: Buffer;
  last4: string;
  keyVersion: number;
} {
  const clean = plain.trim().toUpperCase();
  const keyVersion = getEnv().LICENCE_ENC_ACTIVE_VERSION;
  const key = getKeyForVersion(keyVersion);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(clean, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([iv, tag, enc]),
    last4: clean.slice(-4),
    keyVersion,
  };
}

/**
 * Decrypts a stored licence number BLOB.
 */
export function decryptLicenceNumber(blob: Buffer, keyVersion: number): string {
  const key = getKeyForVersion(keyVersion);
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const enc = blob.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
