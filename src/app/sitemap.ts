import type { MetadataRoute } from 'next';
import { getReadConnection } from '@/db/client';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const { sqlite } = getReadConnection();
  const vehicles = sqlite
    .prepare(
      "SELECT slug, updated_at FROM vehicles WHERE lifecycle = 'active' AND deleted_at IS NULL",
    )
    .all() as Array<{ slug: string; updated_at: number }>;

  return [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/cars`, lastModified: new Date() },
    { url: `${baseUrl}/branches`, lastModified: new Date() },
    { url: `${baseUrl}/policies/cancellation`, lastModified: new Date() },
    { url: `${baseUrl}/policies/damage`, lastModified: new Date() },
    { url: `${baseUrl}/policies/privacy`, lastModified: new Date() },
    ...vehicles.map((v) => ({
      url: `${baseUrl}/cars/${v.slug}`,
      lastModified: new Date(v.updated_at),
    })),
  ];
}
