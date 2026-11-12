import { newPublicId } from '@/domain/shared/ids';
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
  RefundResult,
} from './provider';

/**
 * Deterministic in-process payment provider for local dev and E2E verification (§8.4).
 * Can simulate failure when customerEmail contains '+fail' or idempotencyKey contains 'force-fail'.
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly name = 'fake';
  readonly capabilities = {
    authHold: true,
    upi: true,
    partialRefund: true,
  };

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    if (input.customerEmail.includes('+fail') || input.idempotencyKey.includes('force-fail')) {
      return {
        provider: this.name,
        providerRef: `fake_fail_${newPublicId()}`,
        status: 'failed',
      };
    }

    return {
      provider: this.name,
      providerRef: `fake_pay_${newPublicId()}`,
      status: 'succeeded',
      depositHoldRef: input.depositMinor > 0 ? `fake_hold_${newPublicId()}` : undefined,
    };
  }

  async refund(): Promise<RefundResult> {
    return {
      providerRef: `fake_ref_${newPublicId()}`,
      status: 'succeeded',
    };
  }

  async releaseDeposit(): Promise<RefundResult> {
    return {
      providerRef: `fake_rel_${newPublicId()}`,
      status: 'succeeded',
    };
  }

  async captureDeposit(): Promise<RefundResult> {
    return {
      providerRef: `fake_cap_${newPublicId()}`,
      status: 'succeeded',
    };
  }
}

export function getPaymentProvider(): PaymentProvider {
  return new FakePaymentProvider();
}
