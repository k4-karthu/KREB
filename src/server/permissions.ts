export type Role = 'customer' | 'agent' | 'manager' | 'owner';

export interface AuthActor {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export type Capability =
  | 'admin.access'
  | 'bookings.view_all'
  | 'bookings.view_own'
  | 'bookings.manage'
  | 'bookings.cancel_with_refund'
  | 'handover.perform'
  | 'kyc.review'
  | 'customers.blacklist'
  | 'fleet.read'
  | 'fleet.write'
  | 'maintenance.read'
  | 'maintenance.write'
  | 'pricing.read'
  | 'pricing.write'
  | 'finance.refund_high'
  | 'finance.deposit_capture'
  | 'reports.view'
  | 'settings.manage'
  | 'staff.manage'
  | 'licence.reveal'
  | 'audit.view';

const ROLE_CAPABILITIES: Record<Role, ReadonlySet<Capability>> = {
  owner: new Set<Capability>([
    'admin.access',
    'bookings.view_all',
    'bookings.view_own',
    'bookings.manage',
    'bookings.cancel_with_refund',
    'handover.perform',
    'kyc.review',
    'customers.blacklist',
    'fleet.read',
    'fleet.write',
    'maintenance.read',
    'maintenance.write',
    'pricing.read',
    'pricing.write',
    'finance.refund_high',
    'finance.deposit_capture',
    'reports.view',
    'settings.manage',
    'staff.manage',
    'licence.reveal',
    'audit.view',
  ]),
  manager: new Set<Capability>([
    'admin.access',
    'bookings.view_all',
    'bookings.view_own',
    'bookings.manage',
    'bookings.cancel_with_refund',
    'handover.perform',
    'kyc.review',
    'customers.blacklist',
    'fleet.read',
    'fleet.write',
    'maintenance.read',
    'maintenance.write',
    'pricing.read',
    'pricing.write',
    'finance.refund_high',
    'finance.deposit_capture',
    'reports.view',
    'licence.reveal',
    'audit.view',
  ]),
  agent: new Set<Capability>([
    'admin.access',
    'bookings.view_all',
    'bookings.view_own',
    'bookings.manage',
    'bookings.cancel_with_refund',
    'handover.perform',
    'kyc.review',
    'fleet.read',
    'maintenance.read',
    'pricing.read',
    'licence.reveal',
  ]),
  customer: new Set<Capability>(['bookings.view_own']),
};

/**
 * Single authoritative permission check (§9.3).
 */
export function can(
  actor: AuthActor | null | undefined,
  capability: Capability,
  resourceOwnerId?: string,
): boolean {
  if (!actor) return false;
  if (capability === 'bookings.view_own' && resourceOwnerId) {
    if (actor.role === 'customer') {
      return actor.id === resourceOwnerId;
    }
    return ROLE_CAPABILITIES[actor.role].has('bookings.view_all');
  }
  return ROLE_CAPABILITIES[actor.role].has(capability);
}

export function isStaffRole(role: string | null | undefined): role is Exclude<Role, 'customer'> {
  return role === 'agent' || role === 'manager' || role === 'owner';
}
