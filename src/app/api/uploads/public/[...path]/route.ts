import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getPublicUploadsDir } from '@/server/files';

const MIME_BY_EXT: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.avif': 'image/avif',
};

export async function GET(_req: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params;
  if (!segments || segments.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const baseDir = path.resolve(getPublicUploadsDir());
  const fullPath = path.resolve(baseDir, ...segments);
  if (
    !fullPath.startsWith(baseDir) ||
    !fs.existsSync(fullPath) ||
    !fs.statSync(fullPath).isFile()
  ) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME_BY_EXT[ext] ?? 'application/octet-stream';
  const data = fs.readFileSync(fullPath);

  return new NextResponse(data, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
