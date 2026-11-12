import { z } from 'zod';
import { withImmediateTx } from '@/db/client';
import { handleApiError, jsonOk } from '@/server/http';

const waitlistSchema = z.object({
  email: z.string().email(),
  vehicleId: z.number().int().positive().optional().nullable(),
  category: z.string().optional().nullable(),
  startAt: z.number().int().positive(),
  endAt: z.number().int().positive(),
});

export async function POST(req: Request) {
  try {
    const body = waitlistSchema.parse(await req.json());
    withImmediateTx(({ sqlite }) => {
      sqlite
        .prepare(
          'INSERT INTO waitlist (email, vehicle_id, category, start_at, end_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(
          body.email.toLowerCase(),
          body.vehicleId ?? null,
          body.category ?? null,
          body.startAt,
          body.endAt,
          Date.now(),
        );
    });
    return jsonOk({ ok: true }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
