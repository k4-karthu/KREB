import { getReadConnection } from '@/db/client';

function formatIcsDate(ms: number): string {
  return new Date(ms)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export async function GET(_req: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const { sqlite } = getReadConnection();

  const row = sqlite
    .prepare(
      `
    SELECT b.code, b.start_at, b.end_at, v.make, v.model, v.plate, br.name AS branch_name, br.address AS branch_address
    FROM bookings b
    JOIN vehicles v ON v.id = b.vehicle_id
    JOIN branches br ON br.id = b.pickup_branch_id
    WHERE b.code = ?
  `,
    )
    .get(code) as
    | {
        code: string;
        start_at: number;
        end_at: number;
        make: string;
        model: string;
        plate: string;
        branch_name: string;
        branch_address: string;
      }
    | undefined;

  if (!row) {
    return new Response('Booking not found', { status: 404 });
  }

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kerb Mobility//Car Rental//EN',
    'BEGIN:VEVENT',
    `UID:${row.code}@kerb.local`,
    `DTSTAMP:${formatIcsDate(Date.now())}`,
    `DTSTART:${formatIcsDate(row.start_at)}`,
    `DTEND:${formatIcsDate(row.end_at)}`,
    `SUMMARY:Kerb Car Pick-up - ${row.make} ${row.model} (${row.plate})`,
    `LOCATION:${row.branch_name}, ${row.branch_address}`,
    `DESCRIPTION:Booking code ${row.code}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="kerb-${row.code}.ics"`,
    },
  });
}
