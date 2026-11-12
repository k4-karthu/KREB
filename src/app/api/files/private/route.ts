import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getServerActor } from '@/server/auth';
import { getPrivateUploadsDir, verifyPrivateFileSignature } from '@/server/files';

const MIME_BY_EXT: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
};

export async function GET(req: Request) {
  const actor = await getServerActor();
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get('key') ?? '';
  const exp = url.searchParams.get('exp') ?? '';
  const sig = url.searchParams.get('sig') ?? '';

  if (!key || !exp || !sig || !verifyPrivateFileSignature(key, exp, sig)) {
    return NextResponse.json({ error: 'Invalid or expired file link' }, { status: 403 });
  }

  const baseDir = path.resolve(getPrivateUploadsDir());
  const fullPath = path.resolve(baseDir, key);
  if (
    !fullPath.startsWith(baseDir) ||
    !fs.existsSync(fullPath) ||
    !fs.statSync(fullPath).isFile()
  ) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME_BY_EXT[ext] ?? 'application/octet-stream';
  const data = fs.readFileSync(fullPath);

  return new NextResponse(data, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
