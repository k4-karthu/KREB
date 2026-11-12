import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { bookings, vehicleBlocks } from './bookings';
import { vehicles } from './fleet';

export const inspections = sqliteTable('inspections', {
  id: integer('id').primaryKey(),
  publicId: text('public_id').notNull().unique(),
  bookingId: integer('booking_id')
    .notNull()
    .references(() => bookings.id),
  type: text('type', { enum: ['checkout', 'checkin'] }).notNull(),
  odometerKm: integer('odometer_km').notNull(),
  fuelKind: text('fuel_kind', { enum: ['eighths', 'percent'] }).notNull(),
  fuelLevel: integer('fuel_level').notNull(),
  cleanliness: text('cleanliness', { enum: ['clean', 'acceptable', 'dirty'] }),
  notes: text('notes'),
  customerSignatureKey: text('customer_signature_key'),
  customerSignedAt: integer('customer_signed_at'),
  inspectedBy: text('inspected_by')
    .notNull()
    .references(() => user.id),
  inspectedAt: integer('inspected_at').notNull(),
});

export const inspectionPhotos = sqliteTable('inspection_photos', {
  id: integer('id').primaryKey(),
  inspectionId: integer('inspection_id')
    .notNull()
    .references(() => inspections.id, { onDelete: 'cascade' }),
  shot: text('shot').notNull(),
  fileKey: text('file_key').notNull(),
  takenAt: integer('taken_at').notNull(),
});

export const inspectionMarks = sqliteTable('inspection_marks', {
  id: integer('id').primaryKey(),
  inspectionId: integer('inspection_id')
    .notNull()
    .references(() => inspections.id, { onDelete: 'cascade' }),
  zone: text('zone').notNull(),
  kind: text('kind', {
    enum: ['scratch', 'dent', 'chip', 'crack', 'stain', 'missing', 'other'],
  }).notNull(),
  severity: integer('severity').notNull(),
  x: real('x'),
  y: real('y'),
  note: text('note'),
  photoId: integer('photo_id').references(() => inspectionPhotos.id),
});

export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey(),
  publicId: text('public_id').notNull().unique(),
  bookingId: integer('booking_id')
    .notNull()
    .references(() => bookings.id),
  kind: text('kind', {
    enum: [
      'charge',
      'deposit_hold',
      'deposit_capture',
      'deposit_release',
      'refund',
      'penalty',
      'manual',
    ],
  }).notNull(),
  status: text('status', { enum: ['pending', 'succeeded', 'failed', 'cancelled'] }).notNull(),
  amountMinor: integer('amount_minor').notNull(),
  provider: text('provider').notNull(),
  providerRef: text('provider_ref'),
  method: text('method'),
  parentPaymentId: integer('parent_payment_id'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  reason: text('reason'),
  createdBy: text('created_by'),
  createdAt: integer('created_at').notNull(),
});

export const providerEvents = sqliteTable(
  'provider_events',
  {
    provider: text('provider').notNull(),
    eventId: text('event_id').notNull(),
    receivedAt: integer('received_at').notNull(),
    payloadJson: text('payload_json').notNull(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.eventId] })],
);

export const invoiceSequences = sqliteTable(
  'invoice_sequences',
  {
    series: text('series').notNull(),
    fiscalYear: integer('fiscal_year').notNull(),
    nextNo: integer('next_no').notNull(),
  },
  (t) => [primaryKey({ columns: [t.series, t.fiscalYear] })],
);

export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey(),
  bookingId: integer('booking_id')
    .notNull()
    .references(() => bookings.id),
  series: text('series').notNull(),
  fiscalYear: integer('fiscal_year').notNull(),
  number: integer('number').notNull(),
  kind: text('kind', { enum: ['invoice', 'credit_note'] }).notNull(),
  snapshotJson: text('snapshot_json').notNull(),
  totalMinor: integer('total_minor').notNull(),
  issuedAt: integer('issued_at').notNull(),
});

export const maintenanceLogs = sqliteTable('maintenance_logs', {
  id: integer('id').primaryKey(),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id),
  kind: text('kind', {
    enum: ['service', 'repair', 'tyres', 'inspection', 'body', 'other'],
  }).notNull(),
  title: text('title').notNull(),
  notes: text('notes'),
  garage: text('garage'),
  costMinor: integer('cost_minor').notNull().default(0),
  startsAt: integer('starts_at').notNull(),
  endsAt: integer('ends_at'),
  odometerKm: integer('odometer_km'),
  nextDueOn: text('next_due_on'),
  nextDueKm: integer('next_due_km'),
  status: text('status', { enum: ['scheduled', 'in_progress', 'done', 'cancelled'] }).notNull(),
  blockId: integer('block_id').references(() => vehicleBlocks.id),
});

export const fines = sqliteTable('fines', {
  id: integer('id').primaryKey(),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id),
  bookingId: integer('booking_id').references(() => bookings.id),
  referenceNo: text('reference_no'),
  occurredAt: integer('occurred_at').notNull(),
  place: text('place'),
  amountMinor: integer('amount_minor').notNull(),
  adminFeeMinor: integer('admin_fee_minor').notNull().default(0),
  docFileKey: text('doc_file_key'),
  status: text('status', { enum: ['open', 'charged', 'paid', 'disputed', 'waived'] }).notNull(),
  createdAt: integer('created_at').notNull(),
});

export const damageClaims = sqliteTable('damage_claims', {
  id: integer('id').primaryKey(),
  bookingId: integer('booking_id')
    .notNull()
    .references(() => bookings.id),
  inspectionMarkId: integer('inspection_mark_id').references(() => inspectionMarks.id),
  description: text('description').notNull(),
  estimateMinor: integer('estimate_minor').notNull(),
  finalMinor: integer('final_minor'),
  status: text('status', {
    enum: ['open', 'customer_notified', 'accepted', 'disputed', 'charged', 'waived', 'closed'],
  }).notNull(),
  evidenceJson: text('evidence_json'),
  openedBy: text('opened_by').notNull(),
  openedAt: integer('opened_at').notNull(),
  closedAt: integer('closed_at'),
});

export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey(),
  bookingId: integer('booking_id')
    .notNull()
    .unique()
    .references(() => bookings.id),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  ratingCondition: integer('rating_condition').notNull(),
  ratingClean: integer('rating_clean').notNull(),
  ratingPickup: integer('rating_pickup').notNull(),
  comment: text('comment'),
  status: text('status', { enum: ['pending', 'published', 'hidden'] })
    .notNull()
    .default('pending'),
  createdAt: integer('created_at').notNull(),
});

export const waitlist = sqliteTable('waitlist', {
  id: integer('id').primaryKey(),
  email: text('email').notNull(),
  vehicleId: integer('vehicle_id').references(() => vehicles.id),
  category: text('category'),
  startAt: integer('start_at').notNull(),
  endAt: integer('end_at').notNull(),
  notifiedAt: integer('notified_at'),
  createdAt: integer('created_at').notNull(),
});

export const outbox = sqliteTable('outbox', {
  id: integer('id').primaryKey(),
  kind: text('kind').notNull(),
  toAddr: text('to_addr').notNull(),
  template: text('template').notNull(),
  payloadJson: text('payload_json').notNull(),
  dedupeKey: text('dedupe_key').unique(),
  status: text('status', { enum: ['queued', 'sent', 'failed'] })
    .notNull()
    .default('queued'),
  attempts: integer('attempts').notNull().default(0),
  nextAttemptAt: integer('next_attempt_at').notNull(),
  lastError: text('last_error'),
  sentAt: integer('sent_at'),
  createdAt: integer('created_at').notNull(),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey(),
  at: integer('at').notNull(),
  actorUserId: text('actor_user_id'),
  actorRole: text('actor_role'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  beforeJson: text('before_json'),
  afterJson: text('after_json'),
  requestId: text('request_id'),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  valueJson: text('value_json').notNull(),
  updatedAt: integer('updated_at').notNull(),
  updatedBy: text('updated_by'),
});

export const featureFlags = sqliteTable('feature_flags', {
  key: text('key').primaryKey(),
  enabled: integer('enabled').notNull(),
  note: text('note'),
});

export const jobs = sqliteTable('jobs', {
  name: text('name').primaryKey(),
  lockedUntil: integer('locked_until'),
  lastRunAt: integer('last_run_at'),
  lastStatus: text('last_status'),
  lastError: text('last_error'),
});

export const rateLimits = sqliteTable(
  'rate_limits',
  {
    key: text('key').notNull(),
    windowStart: integer('window_start').notNull(),
    count: integer('count').notNull(),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

export const idempotencyKeys = sqliteTable('idempotency_keys', {
  key: text('key').primaryKey(),
  scope: text('scope').notNull(),
  responseJson: text('response_json'),
  createdAt: integer('created_at').notNull(),
});
