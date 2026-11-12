import fs from 'node:fs';
import path from 'node:path';
import { asc, desc, eq } from 'drizzle-orm';
import { closeConnections, getReadConnection } from '../src/db/client';
import { vehicleImages, vehicles } from '../src/db/schema/fleet';

const SEARCH_DIRS = [path.resolve('public/uploads'), path.resolve('data/uploads/public')];

function hasVariantPair(fileKey: string): boolean {
  const normalizedKey = fileKey.startsWith('vehicles/') ? fileKey : `vehicles/${fileKey}`;
  return SEARCH_DIRS.some(
    (dir) =>
      fs.existsSync(path.join(dir, `${normalizedKey}-640.webp`)) &&
      fs.existsSync(path.join(dir, `${normalizedKey}-1280.webp`)),
  );
}

function main(): void {
  const { db } = getReadConnection();
  try {
    const allVehicles = db
      .select({
        id: vehicles.id,
        slug: vehicles.slug,
        plate: vehicles.plate,
        make: vehicles.make,
        model: vehicles.model,
      })
      .from(vehicles)
      .orderBy(asc(vehicles.id))
      .all();

    if (allVehicles.length === 0) {
      console.log('No vehicles found in database.');
      return;
    }

    let failures = 0;

    for (const vehicle of allVehicles) {
      const primary = db
        .select({ fileKey: vehicleImages.fileKey })
        .from(vehicleImages)
        .where(eq(vehicleImages.vehicleId, vehicle.id))
        .orderBy(desc(vehicleImages.isPrimary), asc(vehicleImages.sortOrder))
        .limit(1)
        .get();

      const label = `${vehicle.plate} (${vehicle.make} ${vehicle.model})`;

      if (!primary) {
        console.error(`FAIL ${label}: no image record in vehicle_images`);
        failures++;
        continue;
      }

      if (!hasVariantPair(primary.fileKey)) {
        console.error(
          `FAIL ${label}: missing ${primary.fileKey}-640.webp or ${primary.fileKey}-1280.webp`,
        );
        failures++;
        continue;
      }

      console.log(`PASS ${label}: ${primary.fileKey}`);
    }

    if (failures > 0) {
      console.error(`\n${failures} of ${allVehicles.length} vehicle(s) failed image validation.`);
      process.exitCode = 1;
    } else {
      console.log(`\nAll ${allVehicles.length} vehicle(s) passed image validation.`);
    }
  } finally {
    closeConnections();
  }
}

main();
