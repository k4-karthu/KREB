import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { resetEnvCache } from '../src/config/env';
import { decryptLicenceNumber, encryptLicenceNumber } from '../src/server/crypto-licence';
import {
  deleteVehicleImageFiles,
  processAndSaveVehicleImage,
  signPrivateFileUrl,
  verifyPrivateFileSignature,
} from '../src/server/files';

const tmpUploads = fs.mkdtempSync(path.join(os.tmpdir(), 'kerb-uploads-'));

describe('media upload pipeline & licence encryption (§10, M3)', () => {
  afterAll(() => {
    fs.rmSync(tmpUploads, { recursive: true, force: true });
    delete process.env.UPLOADS_PATH;
    resetEnvCache();
  });

  it('rejects non-image polyglot/executable buffers', async () => {
    process.env.UPLOADS_PATH = tmpUploads;
    resetEnvCache();

    const fakeExe = Buffer.from('MZ\x90\x00\x03\x00\x00\x00This is not a JPEG');
    await expect(processAndSaveVehicleImage(fakeExe)).rejects.toThrow(/Unsupported or invalid/);
  });

  it('strips EXIF metadata, writes responsive variants, and generates thumbhash', async () => {
    process.env.UPLOADS_PATH = tmpUploads;
    resetEnvCache();

    const inputWithExif = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: { r: 20, g: 50, b: 59 },
      },
    })
      .withMetadata({ exif: { IFD0: { ImageDescription: 'GPS_SECRET_TEST' } } })
      .jpeg()
      .toBuffer();

    const saved = await processAndSaveVehicleImage(inputWithExif);
    expect(saved.fileKey).toMatch(/^vehicles\//);
    expect(saved.width).toBe(1200);
    expect(saved.height).toBe(800);
    expect(saved.thumbhash.length).toBeGreaterThan(8);

    const out640 = path.join(tmpUploads, 'uploads', 'public', `${saved.fileKey}-640.jpg`);
    expect(fs.existsSync(out640)).toBe(true);
    const meta = await sharp(out640).metadata();
    expect(meta.exif).toBeUndefined();

    deleteVehicleImageFiles(saved.fileKey);
    expect(fs.existsSync(out640)).toBe(false);
  });

  it('encrypts/decrypts licence numbers and verifies signed private URLs', () => {
    const enc = encryptLicenceNumber('KA03 20200012345');
    expect(enc.last4).toBe('2345');
    expect(decryptLicenceNumber(enc.ciphertext, enc.keyVersion)).toBe('KA03 20200012345');

    const url = signPrivateFileUrl('licences/abc.webp', 120);
    const parsed = new URL(`http://localhost${url}`);
    expect(
      verifyPrivateFileSignature(
        parsed.searchParams.get('key') ?? '',
        parsed.searchParams.get('exp') ?? '',
        parsed.searchParams.get('sig') ?? '',
      ),
    ).toBe(true);
    expect(
      verifyPrivateFileSignature(
        'licences/other.webp',
        parsed.searchParams.get('exp') ?? '',
        parsed.searchParams.get('sig') ?? '',
      ),
    ).toBe(false);
  });
});
