import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const TARGET_WIDTH = 1200;
const TARGET_HEIGHT = 800;
const WEBP_QUALITY = 85;

async function main(): Promise<void> {
  const [, , inputArg, outputArg] = process.argv;

  if (!inputArg || !outputArg) {
    console.error('Usage: npx tsx scripts/normalize-car-image.ts <input> <output.webp>');
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  const outputPath = path.resolve(outputArg);

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  await sharp(inputPath)
    .rotate()
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .webp({ quality: WEBP_QUALITY })
    .toFile(outputPath);

  console.log(
    `Normalized ${inputPath} -> ${outputPath} (${TARGET_WIDTH}x${TARGET_HEIGHT} WebP q${WEBP_QUALITY})`,
  );
}

main().catch((err) => {
  console.error('Failed to normalize image:', err);
  process.exit(1);
});
