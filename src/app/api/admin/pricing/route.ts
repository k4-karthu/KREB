import { z } from 'zod';
import { getReadConnection, withImmediateTx } from '@/db/client';
import { writeAudit } from '@/domain/audit/audit';
import { newPublicId } from '@/domain/shared/ids';
import { requireStaffCapability } from '@/server/auth';
import { handleApiError, jsonOk } from '@/server/http';

const pricingActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create_rate_plan'),
    name: z.string().min(2).max(80),
    baseDailyMinor: z.number().int().positive(),
    minDurationMinutes: z.number().int().min(60).default(240),
    maxDurationMinutes: z.number().int().min(240).default(43200),
  }),
  z.object({
    action: z.literal('update_rate_plan'),
    id: z.number().int().positive(),
    baseDailyMinor: z.number().int().positive(),
    isActive: z.boolean(),
  }),
  z.object({
    action: z.literal('create_rule'),
    ratePlanId: z.number().int().positive().nullable(),
    kind: z.enum(['weekday_multiplier', 'date_range_multiplier', 'date_range_flat_add']),
    weekdaysMask: z.number().int().min(0).max(127).nullable(),
    startsOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    endsOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    multiplierBp: z.number().int().min(1000).max(50000).nullable(),
    flatAddMinor: z.number().int().nullable(),
    label: z.string().min(2).max(80),
    priority: z.number().int().default(100),
  }),
  z.object({
    action: z.literal('toggle_rule'),
    id: z.number().int().positive(),
    isActive: z.boolean(),
  }),
  z.object({
    action: z.literal('create_addon'),
    name: z.string().min(2).max(80),
    description: z.string().max(240).nullable(),
    priceType: z.enum(['per_day', 'flat']),
    priceMinor: z.number().int().min(0),
    maxQty: z.number().int().min(1).max(10).default(1),
  }),
  z.object({
    action: z.literal('toggle_addon'),
    id: z.number().int().positive(),
    isActive: z.boolean(),
  }),
  z.object({
    action: z.literal('create_promo'),
    code: z.string().min(3).max(24),
    kind: z.enum(['percent', 'flat']),
    value: z.number().int().positive(),
    minDays: z.number().int().min(1).default(1),
    appliesTo: z.enum(['base', 'subtotal']).default('base'),
    maxUses: z.number().int().positive().nullable(),
  }),
  z.object({
    action: z.literal('toggle_promo'),
    id: z.number().int().positive(),
    isActive: z.boolean(),
  }),
]);

export async function GET() {
  try {
    await requireStaffCapability('pricing.read');
    const { sqlite } = getReadConnection();
    const ratePlans = sqlite.prepare('SELECT * FROM rate_plans ORDER BY id ASC').all();
    const rateTiers = sqlite
      .prepare('SELECT * FROM rate_tiers ORDER BY rate_plan_id ASC, from_days ASC')
      .all();
    const rules = sqlite.prepare('SELECT * FROM pricing_rules ORDER BY priority ASC, id ASC').all();
    const addons = sqlite
      .prepare('SELECT * FROM addons WHERE deleted_at IS NULL ORDER BY id ASC')
      .all();
    const protectionPlans = sqlite
      .prepare('SELECT * FROM protection_plans ORDER BY tier ASC')
      .all();
    const promoCodes = sqlite.prepare('SELECT * FROM promo_codes ORDER BY id DESC').all();

    return jsonOk({
      ratePlans,
      rateTiers,
      rules,
      addons,
      protectionPlans,
      promoCodes,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireStaffCapability('pricing.write');
    const body = pricingActionSchema.parse(await req.json());
    const now = Date.now();

    withImmediateTx(({ sqlite }) => {
      switch (body.action) {
        case 'create_rate_plan': {
          sqlite
            .prepare(
              'INSERT INTO rate_plans (public_id, name, base_daily_minor, min_duration_minutes, max_duration_minutes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
            )
            .run(
              `rp_${newPublicId()}`,
              body.name,
              body.baseDailyMinor,
              body.minDurationMinutes,
              body.maxDurationMinutes,
              now,
              now,
            );
          break;
        }
        case 'update_rate_plan': {
          sqlite
            .prepare(
              'UPDATE rate_plans SET base_daily_minor = ?, is_active = ?, updated_at = ? WHERE id = ?',
            )
            .run(body.baseDailyMinor, body.isActive ? 1 : 0, now, body.id);
          break;
        }
        case 'create_rule': {
          sqlite
            .prepare(
              'INSERT INTO pricing_rules (rate_plan_id, kind, weekdays_mask, starts_on, ends_on, multiplier_bp, flat_add_minor, priority, label, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
            )
            .run(
              body.ratePlanId,
              body.kind,
              body.weekdaysMask,
              body.startsOn,
              body.endsOn,
              body.multiplierBp,
              body.flatAddMinor,
              body.priority,
              body.label,
            );
          break;
        }
        case 'toggle_rule': {
          sqlite
            .prepare('UPDATE pricing_rules SET is_active = ? WHERE id = ?')
            .run(body.isActive ? 1 : 0, body.id);
          break;
        }
        case 'create_addon': {
          sqlite
            .prepare(
              'INSERT INTO addons (public_id, name, description, price_type, price_minor, max_qty, is_refundable, is_active) VALUES (?, ?, ?, ?, ?, ?, 1, 1)',
            )
            .run(
              `ad_${newPublicId()}`,
              body.name,
              body.description,
              body.priceType,
              body.priceMinor,
              body.maxQty,
            );
          break;
        }
        case 'toggle_addon': {
          sqlite
            .prepare('UPDATE addons SET is_active = ? WHERE id = ?')
            .run(body.isActive ? 1 : 0, body.id);
          break;
        }
        case 'create_promo': {
          sqlite
            .prepare(
              'INSERT INTO promo_codes (code, kind, value, min_days, max_uses, used_count, per_user_limit, applies_to, is_active) VALUES (?, ?, ?, ?, ?, 0, 1, ?, 1)',
            )
            .run(
              body.code.toUpperCase(),
              body.kind,
              body.value,
              body.minDays,
              body.maxUses,
              body.appliesTo,
            );
          break;
        }
        case 'toggle_promo': {
          sqlite
            .prepare('UPDATE promo_codes SET is_active = ? WHERE id = ?')
            .run(body.isActive ? 1 : 0, body.id);
          break;
        }
      }

      writeAudit(sqlite, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: `pricing.${body.action}`,
        entityType: 'pricing',
        entityId: 'catalog',
        after: body,
      });
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
