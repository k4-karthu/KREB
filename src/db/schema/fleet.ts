import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const branches = sqliteTable('branches', {
  id: integer('id').primaryKey(),
  publicId: text('public_id').notNull().unique(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  address: text('address').notNull(),
  lat: real('lat'),
  lng: real('lng'),
  timezone: text('timezone').notNull(),
  phone: text('phone'),
  email: text('email'),
  allowsAfterHours: integer('allows_after_hours').notNull().default(0),
  afterHoursFeeMinor: integer('after_hours_fee_minor').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export const branchHours = sqliteTable(
  'branch_hours',
  {
    branchId: integer('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    weekday: integer('weekday').notNull(),
    opensMinute: integer('opens_minute').notNull(),
    closesMinute: integer('closes_minute').notNull(),
  },
  (t) => [primaryKey({ columns: [t.branchId, t.weekday] })],
);

export const branchClosures = sqliteTable('branch_closures', {
  id: integer('id').primaryKey(),
  branchId: integer('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  startsOn: text('starts_on').notNull(),
  endsOn: text('ends_on').notNull(),
  reason: text('reason'),
});

export const oneWayFees = sqliteTable(
  'one_way_fees',
  {
    fromBranchId: integer('from_branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    toBranchId: integer('to_branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    feeMinor: integer('fee_minor').notNull(),
  },
  (t) => [primaryKey({ columns: [t.fromBranchId, t.toBranchId] })],
);

export const ratePlans = sqliteTable('rate_plans', {
  id: integer('id').primaryKey(),
  publicId: text('public_id').notNull().unique(),
  name: text('name').notNull(),
  baseDailyMinor: integer('base_daily_minor').notNull(),
  minDurationMinutes: integer('min_duration_minutes').notNull().default(240),
  maxDurationMinutes: integer('max_duration_minutes').notNull().default(43200),
  isActive: integer('is_active').notNull().default(1),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const rateTiers = sqliteTable('rate_tiers', {
  id: integer('id').primaryKey(),
  ratePlanId: integer('rate_plan_id')
    .notNull()
    .references(() => ratePlans.id, { onDelete: 'cascade' }),
  fromDays: integer('from_days').notNull(),
  discountBp: integer('discount_bp').notNull(),
});

export const pricingRules = sqliteTable('pricing_rules', {
  id: integer('id').primaryKey(),
  ratePlanId: integer('rate_plan_id').references(() => ratePlans.id, { onDelete: 'cascade' }),
  kind: text('kind', {
    enum: ['weekday_multiplier', 'date_range_multiplier', 'date_range_flat_add'],
  }).notNull(),
  weekdaysMask: integer('weekdays_mask'),
  startsOn: text('starts_on'),
  endsOn: text('ends_on'),
  multiplierBp: integer('multiplier_bp'),
  flatAddMinor: integer('flat_add_minor'),
  priority: integer('priority').notNull().default(100),
  label: text('label').notNull(),
  isActive: integer('is_active').notNull().default(1),
});

export const vehicles = sqliteTable('vehicles', {
  id: integer('id').primaryKey(),
  publicId: text('public_id').notNull().unique(),
  slug: text('slug').notNull().unique(),
  homeBranchId: integer('home_branch_id')
    .notNull()
    .references(() => branches.id),
  currentBranchId: integer('current_branch_id')
    .notNull()
    .references(() => branches.id),
  make: text('make').notNull(),
  model: text('model').notNull(),
  variant: text('variant'),
  year: integer('year').notNull(),
  plate: text('plate').notNull().unique(),
  vin: text('vin').unique(),
  category: text('category', {
    enum: ['hatchback', 'sedan', 'suv', 'muv', 'luxury', 'ev', 'van'],
  }).notNull(),
  transmission: text('transmission', { enum: ['manual', 'automatic'] }).notNull(),
  fuelType: text('fuel_type', {
    enum: ['petrol', 'diesel', 'hybrid', 'electric', 'cng'],
  }).notNull(),
  seats: integer('seats').notNull(),
  doors: integer('doors'),
  luggageLiters: integer('luggage_liters'),
  engineCc: integer('engine_cc'),
  batteryKwh: real('battery_kwh'),
  rangeKm: integer('range_km'),
  paintName: text('paint_name').notNull(),
  paintHex: text('paint_hex').notNull(),
  ratePlanId: integer('rate_plan_id')
    .notNull()
    .references(() => ratePlans.id),
  depositMinor: integer('deposit_minor').notNull().default(0),
  kmPerDay: integer('km_per_day'),
  extraKmMinor: integer('extra_km_minor').notNull().default(0),
  minDriverAge: integer('min_driver_age').notNull().default(21),
  minLicenceYears: integer('min_licence_years').notNull().default(1),
  odometerKm: integer('odometer_km').notNull().default(0),
  lifecycle: text('lifecycle', { enum: ['draft', 'active', 'retired'] })
    .notNull()
    .default('draft'),
  opsState: text('ops_state', { enum: ['ready', 'cleaning', 'inspection', 'hold'] })
    .notNull()
    .default('ready'),
  description: text('description'),
  specsJson: text('specs_json'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export const vehicleImages = sqliteTable('vehicle_images', {
  id: integer('id').primaryKey(),
  publicId: text('public_id').notNull().unique(),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  fileKey: text('file_key').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  thumbhash: text('thumbhash').notNull(),
  altText: text('alt_text').notNull(),
  shotType: text('shot_type', {
    enum: ['front34', 'side', 'rear34', 'interior', 'dashboard', 'boot', 'detail', 'other'],
  }),
  isPrimary: integer('is_primary').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const features = sqliteTable('features', {
  id: integer('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  label: text('label').notNull(),
  iconKey: text('icon_key'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const vehicleFeatures = sqliteTable(
  'vehicle_features',
  {
    vehicleId: integer('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    featureId: integer('feature_id')
      .notNull()
      .references(() => features.id, { onDelete: 'restrict' }),
  },
  (t) => [primaryKey({ columns: [t.vehicleId, t.featureId] })],
);

export const vehicleDocuments = sqliteTable('vehicle_documents', {
  id: integer('id').primaryKey(),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  kind: text('kind', {
    enum: ['registration', 'insurance', 'road_tax', 'emissions', 'permit', 'other'],
  }).notNull(),
  referenceNo: text('reference_no'),
  fileKey: text('file_key'),
  issuedOn: text('issued_on'),
  expiresOn: text('expires_on'),
  createdAt: integer('created_at').notNull(),
});
