import { expect, test } from '@playwright/test';

test('health endpoint returns ok', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { ok: boolean; service: string };
  expect(body.ok).toBe(true);
  expect(body.service).toBe('kerb');
});
