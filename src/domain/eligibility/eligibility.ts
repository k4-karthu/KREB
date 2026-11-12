import { Temporal } from '@js-temporal/polyfill';
import { getBranchLocalDate } from '@/domain/shared/time';

export interface EligibilityBlocker {
  code: string;
  message: string;
  fix: string;
}

export interface EligibilityWarning {
  code: string;
  message: string;
}

export interface EligibilityInput {
  dateOfBirth: string | null;
  isBlacklisted: boolean;
  blacklistReason?: string | null;
  licence: {
    status: 'pending' | 'verified' | 'rejected' | 'expired';
    expiresOn: string;
    issuedOn?: string | null;
  } | null;
  vehicle: {
    minDriverAge: number;
    minLicenceYears: number;
  };
  pickupAt: number;
  returnAt: number;
  branchTimezone: string;
  kycRequiredBeforePay: boolean;
}

export function checkEligibility(input: EligibilityInput): {
  ok: boolean;
  blockers: EligibilityBlocker[];
  warnings: EligibilityWarning[];
} {
  const blockers: EligibilityBlocker[] = [];
  const warnings: EligibilityWarning[] = [];

  if (input.isBlacklisted) {
    blockers.push({
      code: 'CUSTOMER_BLACKLISTED',
      message: 'This account is restricted from online rentals.',
      fix: 'Contact our support desk for account review.',
    });
  }

  if (input.dateOfBirth) {
    try {
      const dob = Temporal.PlainDate.from(input.dateOfBirth);
      const pickupDate = Temporal.PlainDate.from(
        getBranchLocalDate(input.pickupAt, input.branchTimezone),
      );
      const age = pickupDate.since(dob, { largestUnit: 'years' }).years;
      if (age < input.vehicle.minDriverAge) {
        blockers.push({
          code: 'DRIVER_UNDERAGE',
          message: `Minimum driver age for this vehicle is ${input.vehicle.minDriverAge}.`,
          fix: 'Choose a standard category vehicle or have an eligible driver book.',
        });
      }
    } catch {
      blockers.push({
        code: 'INVALID_DOB',
        message: 'Your profile date of birth is incomplete.',
        fix: 'Update your date of birth in your profile.',
      });
    }
  } else {
    warnings.push({
      code: 'DOB_MISSING',
      message: 'Add your date of birth before checkout to confirm age eligibility.',
    });
  }

  if (!input.licence) {
    if (input.kycRequiredBeforePay) {
      blockers.push({
        code: 'LICENCE_MISSING',
        message: 'A driving licence is required before confirming this booking.',
        fix: 'Upload your driving licence front and back in your account or step 2.',
      });
    } else {
      warnings.push({
        code: 'LICENCE_PENDING_PICKUP',
        message: 'Upload your driving licence before pick-up so the counter handover stays fast.',
      });
    }
  } else {
    if (input.licence.status === 'rejected') {
      blockers.push({
        code: 'LICENCE_REJECTED',
        message: 'Your previous licence upload was rejected.',
        fix: 'Upload a clear, valid driving licence photo to continue.',
      });
    } else if (input.licence.status === 'expired') {
      blockers.push({
        code: 'LICENCE_EXPIRED',
        message: 'Your driving licence on file has expired.',
        fix: 'Upload a renewed driving licence to continue.',
      });
    } else if (input.licence.status === 'pending' && input.kycRequiredBeforePay) {
      warnings.push({
        code: 'LICENCE_PENDING_APPROVAL',
        message:
          'We are checking your licence. Your booking will wait for desk approval if not verified yet.',
      });
    }

    const returnLocalDate = getBranchLocalDate(input.returnAt, input.branchTimezone);
    if (input.licence.expiresOn < returnLocalDate) {
      blockers.push({
        code: 'LICENCE_EXPIRES_MID_TRIP',
        message: `Your licence expires on ${input.licence.expiresOn}, before your return on ${returnLocalDate}.`,
        fix: 'Upload a renewed licence to continue.',
      });
    }
  }

  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
  };
}
