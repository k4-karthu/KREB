import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { branches, vehicles } from './fleet';

export const addons = sqliteTable('addons', {
  id: integer('id').primaryKey(),
  publicId: text('public_id').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  priceType: text('price_type', { enum: ['per_day', 'flat'] }).notNull(),
  priceMinor: integer('price_minor').notNull(),
  maxQty: integer('max_qty').notNull().default(1),
  isRefundable: integer('is_refundable').notNull().default(1),
  isActive: integer('is_active').notNull().default(1),
  deletedAt: integer('deleted_at'),
});

export const protectionPlans = sqliteTable('protection_plans', {
  id: integer('id').primaryKey(),
  publicId: text('public_id').notNull().unique(),
  tier: integer('tier').notNull(),
  name: text('name').notNull(),
  summary: text('summary').notNull(),
  covered: text('covered').notNull(),
  notCovered: text('not_covered').notNull(),
  perDayMinor: integer('per_day_minor').notNull(),
  excessMinor: integer('excess_minor').notNull(),
  isActive: integer('is_active').notNull().default(1),
});

export const promoCodes = sqliteTable('promo_codes', {
  id: integer('id').primaryKey(),
  code: text('code').notNull().unique(),
  kind: text('kind', { enum: ['percent', 'flat'] }).notNull(),
  value: integer('value').notNull(),
  validFrom: integer('valid_from'),
  validTo: integer('valid_to'),
  minDays: integer('min_days').notNull().default(1),
  categoriesJson: text('categories_json'),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').notNull().default(0),
  perUserLimit: integer('per_user_limit').notNull().default(1),
  appliesTo: text('applies_to', { enum: ['base', 'subtotal'] })
    .notNull()
    .default('base'),
  isActive: integer('is_active').notNull().default(1),
});

export const quotes = sqliteTable('quotes', {
  id: integer('id').primaryKey(),
  publicId: text('public_id').notNull().unique(),
  userId: text('user_id').references(() => user.id),
  sessionKey: text('session_key'),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id),
  pickupBranchId: integer('pickup_branch_id')
    .notNull()
    .references(() => branches.id),
  returnBranchId: integer('return_branch_id')
    .notNull()
    .references(() => branches.id),
  startAt: integer('start_at').notNull(),
  endAt: integer('end_at').notNull(),
  inputsJson: text('inputs_json').notNull(),
  linesJson: text('lines_json').notNull(),
  totalMinor: integer('total_minor').notNull(),
  depositMinor: integer('deposit_minor').notNull(),
  engineVersion: text('engine_version').notNull(),
  signature: text('signature').notNull(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const bookings = sqliteTable('bookings', {
  id: integer('id').primaryKey(),
  publicId: text('public_id').notNull().unique(),
  code: text('code').notNull().unique(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id),
  pickupBranchId: integer('pickup_branch_id')
    .notNull()
    .references(() => branches.id),
  returnBranchId: integer('return_branch_id')
    .notNull()
    .references(() => branches.id),
  startAt: integer('start_at').notNull(),
  endAt: integer('end_at').notNull(),
  actualStartAt: integer('actual_start_at'),
  actualEndAt: integer('actual_end_at'),
  status: text('status', {
    enum: [
      'pending_payment',
      'pending_approval',
      'confirmed',
      'active',
      'returned',
      'completed',
      'cancelled',
      'no_show',
      'expired',
      'rejected',
    ],
  }).notNull(),
  quoteId: integer('quote_id').references(() => quotes.id),
  currency: text('currency').notNull(),
  subtotalMinor: integer('subtotal_minor').notNull(),
  discountMinor: integer('discount_minor').notNull().default(0),
  taxMinor: integer('tax_minor').notNull(),
  totalMinor: integer('total_minor').notNull(),
  depositMinor: integer('deposit_minor').notNull().default(0),
  taxRateBpSnapshot: integer('tax_rate_bp_snapshot').notNull(),
  dailyRateMinorSnapshot: integer('daily_rate_minor_snapshot').notNull(),
  protectionPlanId: integer('protection_plan_id').references(() => protectionPlans.id),
  promoCodeId: integer('promo_code_id').references(() => promoCodes.id),
  policySnapshotJson: text('policy_snapshot_json').notNull(),
  source: text('source', { enum: ['web', 'counter', 'phone', 'admin'] })
    .notNull()
    .default('web'),
  cancelReason: text('cancel_reason'),
  cancelledAt: integer('cancelled_at'),
  createdBy: text('created_by').references(() => user.id),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const bookingLineItems = sqliteTable('booking_line_items', {
  id: integer('id').primaryKey(),
  bookingId: integer('booking_id')
    .notNull()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  kind: text('kind', {
    enum: [
      'base',
      'rule',
      'tier_discount',
      'addon',
      'protection',
      'fee',
      'promo',
      'tax',
      'post_rental',
    ],
  }).notNull(),
  label: text('label').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitMinor: integer('unit_minor').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  taxable: integer('taxable').notNull().default(1),
  metaJson: text('meta_json'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const bookingEvents = sqliteTable('booking_events', {
  id: integer('id').primaryKey(),
  bookingId: integer('booking_id')
    .notNull()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  fromStatus: text('from_status'),
  toStatus: text('to_status'),
  actorUserId: text('actor_user_id'),
  actorKind: text('actor_kind', { enum: ['customer', 'staff', 'system', 'provider'] }).notNull(),
  payloadJson: text('payload_json'),
  createdAt: integer('created_at').notNull(),
});

export const vehicleBlocks = sqliteTable('vehicle_blocks', {
  id: integer('id').primaryKey(),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id),
  kind: text('kind', { enum: ['booking', 'hold', 'maintenance', 'manual'] }).notNull(),
  bookingId: integer('booking_id').references(() => bookings.id, { onDelete: 'cascade' }),
  startAt: integer('start_at').notNull(),
  endAt: integer('end_at').notNull(),
  bufferEndAt: integer('buffer_end_at').notNull(),
  expiresAt: integer('expires_at'),
  releasedAt: integer('released_at'),
  note: text('note'),
  createdBy: text('created_by'),
  createdAt: integer('created_at').notNull(),
});
