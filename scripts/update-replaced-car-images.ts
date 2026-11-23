import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

import { and, eq } from 'drizzle-orm';
import sharp from 'sharp';
import { closeConnections, getWriteConnection } from '../src/db/client';
import { vehicleImages, vehicles } from '../src/db/schema/fleet';
import { processAndSaveVehicleImage } from '../src/server/files';

async function createDetailCropBuffer(sourceBuffer: Buffer): Promise<Buffer> {
  const meta = await sharp(sourceBuffer).metadata();
  const w = meta.width ?? 1200;
  const h = meta.height ?? 800;
  const cropW = Math.max(400, Math.round(w * 0.76));
  const cropH = Math.max(266, Math.round(h * 0.76));
  const left = Math.max(0, Math.round((w - cropW) * 0.65));
  const top = Math.max(0, Math.round((h - cropH) * 0.55));
  return sharp(sourceBuffer)
    .extract({ left, top, width: Math.min(cropW, w - left), height: Math.min(cropH, h - top) })
    .resize(1200, 800, { fit: 'cover' })
    .jpeg({ quality: 88 })
    .toBuffer();
}

const TARGET_SLUGS = ['audi-a6-technology', 'bmw-330li-m-sport', 'toyota-innova-hycross-zx'];

async function main() {
  const { db } = getWriteConnection();
  try {
    for (const slug of TARGET_SLUGS) {
      console.log(`Processing ${slug}...`);
      const vehicle = db.select().from(vehicles).where(eq(vehicles.slug, slug)).get();

      if (!vehicle) {
        console.error(`Vehicle with slug ${slug} not found!`);
        continue;
      }

      const assetPath = path.resolve(
        process.cwd(),
        'scripts',
        'seed-assets',
        'cars',
        `${slug}.jpg`,
      );
      if (!existsSync(assetPath)) {
        console.error(`Asset not found: ${assetPath}`);
        continue;
      }

      const imgBuf = readFileSync(assetPath);
      const saved = await processAndSaveVehicleImage(imgBuf);

      // Update primary image
      db.update(vehicleImages)
        .set({
          fileKey: saved.fileKey,
          width: saved.width,
          height: saved.height,
          thumbhash: saved.thumbhash,
          altText: `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.variant ?? ''} in ${vehicle.paintName}, front three-quarter view`,
          shotType: 'front34',
        })
        .where(and(eq(vehicleImages.vehicleId, vehicle.id), eq(vehicleImages.isPrimary, 1)))
        .run();

      // Update detail image
      const detailBuf = await createDetailCropBuffer(imgBuf);
      const savedDetail = await processAndSaveVehicleImage(detailBuf);

      db.update(vehicleImages)
        .set({
          fileKey: savedDetail.fileKey,
          width: savedDetail.width,
          height: savedDetail.height,
          thumbhash: savedDetail.thumbhash,
          altText: `${vehicle.year} ${vehicle.make} ${vehicle.model} exterior detail`,
          shotType: 'detail',
        })
        .where(and(eq(vehicleImages.vehicleId, vehicle.id), eq(vehicleImages.isPrimary, 0)))
        .run();

      console.log(
        `Successfully updated ${slug} images: primary=${saved.fileKey}, detail=${savedDetail.fileKey}`,
      );
    }
    console.log('Finished updating target vehicle images.');
  } finally {
    closeConnections();
  }
}

main().catch((err) => {
  console.error('Error updating images:', err);
  process.exit(1);
});
