import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { rgbaToThumbHash } from 'thumbhash';
import { getEnv } from '@/config/env';

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export function getPublicUploadsDir(): string {
  const root = path.resolve(getEnv().UPLOADS_PATH);
  const dir = path.join(root, 'uploads', 'public');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getPrivateUploadsDir(): string {
  const root = path.resolve(getEnv().UPLOADS_PATH);
  const dir = path.join(root, 'uploads', 'private');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export interface ProcessedVehicleImage {
  fileKey: string;
  width: number;
  height: number;
  thumbhash: string;
}

/**
 * Validates magic bytes, strips EXIF/GPS metadata, generates responsive 640 & 1280 WebP/JPEG variants
 * and computes a ThumbHash placeholder (§10, M3 Task 3).
 */
export async function processAndSaveVehicleImage(buffer: Buffer): Promise<ProcessedVehicleImage> {
  if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error('Image must be between 1 byte and 10 MB.');
  }

  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_IMAGE_MIMES.has(detected.mime)) {
    throw new Error(
      'Unsupported or invalid file. Only genuine JPEG, PNG, WebP, or AVIF images are allowed.',
    );
  }

  const pipeline = sharp(buffer, { failOn: 'error' }).rotate();
  const meta = await pipeline.metadata();
  const width = meta.width ?? 1200;
  const height = meta.height ?? 800;

  const id = crypto.randomUUID();
  const fileKey = `vehicles/${id}`;
  const outDir = path.join(getPublicUploadsDir(), 'vehicles');
  fs.mkdirSync(outDir, { recursive: true });

  // Strip EXIF automatically by omitting withMetadata()
  for (const targetWidth of [640, 1280]) {
    const resized = sharp(buffer).rotate().resize({
      width: targetWidth,
      withoutEnlargement: true,
    });
    await resized
      .clone()
      .webp({ quality: 82 })
      .toFile(path.join(outDir, `${id}-${targetWidth}.webp`));
    await resized
      .clone()
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(path.join(outDir, `${id}-${targetWidth}.jpg`));
  }

  // Compute thumbhash on a <= 100x100 RGBA thumbnail
  const thumb = await sharp(buffer)
    .rotate()
    .resize(100, 100, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const hashBytes = rgbaToThumbHash(thumb.info.width, thumb.info.height, thumb.data);
  const thumbhash = Buffer.from(hashBytes).toString('base64');

  return { fileKey, width, height, thumbhash };
}

/**
 * Deletes all generated variants for a vehicle image fileKey.
 */
export function deleteVehicleImageFiles(fileKey: string): void {
  const baseDir = getPublicUploadsDir();
  const resolvedBase = path.resolve(baseDir);
  for (const suffix of ['-640.webp', '-640.jpg', '-1280.webp', '-1280.jpg']) {
    const full = path.resolve(baseDir, `${fileKey}${suffix}`);
    if (full.startsWith(resolvedBase) && fs.existsSync(full)) {
      fs.unlinkSync(full);
    }
  }
}

/**
 * Validates & stores a private document/photo (KYC licence, vehicle compliance doc, handover photo).
 * Re-encodes images with sharp to strip EXIF and neutralize polyglots.
 */
export async function savePrivateFile(
  buffer: Buffer,
  subdir: 'licences' | 'docs' | 'inspections',
  allowPdf = false,
): Promise<string> {
  if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error('File must be between 1 byte and 10 MB.');
  }

  const detected = await fileTypeFromBuffer(buffer);
  const id = crypto.randomUUID();
  const dir = path.join(getPrivateUploadsDir(), subdir);
  fs.mkdirSync(dir, { recursive: true });

  if (detected && ALLOWED_IMAGE_MIMES.has(detected.mime)) {
    const fileKey = `${subdir}/${id}.webp`;
    await sharp(buffer, { failOn: 'error' })
      .rotate()
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 84 })
      .toFile(path.join(getPrivateUploadsDir(), fileKey));
    return fileKey;
  }

  if (allowPdf && detected?.mime === 'application/pdf') {
    const fileKey = `${subdir}/${id}.pdf`;
    fs.writeFileSync(path.join(getPrivateUploadsDir(), fileKey), buffer);
    return fileKey;
  }

  throw new Error('Invalid file type.');
}

export function signPrivateFileUrl(fileKey: string, ttlSeconds = 300): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${fileKey}:${exp}`;
  const sig = crypto.createHmac('sha256', getEnv().AUTH_SECRET).update(payload).digest('hex');
  const params = new URLSearchParams({
    key: fileKey,
    exp: String(exp),
    sig,
  });
  return `/api/files/private?${params.toString()}`;
}

export function verifyPrivateFileSignature(fileKey: string, expStr: string, sig: string): boolean {
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const payload = `${fileKey}:${exp}`;
  const expected = crypto.createHmac('sha256', getEnv().AUTH_SECRET).update(payload).digest('hex');
  if (expected.length !== sig.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}
