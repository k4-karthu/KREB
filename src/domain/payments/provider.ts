import type { MinorUnits } from '@/domain/shared/money';

export interface ProviderCapabilities {
  authHold: boolean;
  upi: boolean;
  partialRefund: boolean;
}

export interface CreateCheckoutInput {
  bookingCode: string;
  amountMinor: MinorUnits;
  depositMinor: MinorUnits;
  currency: string;
  idempotencyKey: string;
  customerEmail: string;
}

export interface CreateCheckoutResult {
  provider: string;
  providerRef: string;
  status: 'succeeded' | 'pending' | 'failed';
  depositHoldRef?: string;
}

export interface RefundResult {
  providerRef: string;
  status: 'succeeded' | 'pending' | 'failed';
}

export interface PaymentProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  refund(params: {
    providerRef: string;
    amountMinor: MinorUnits;
    idempotencyKey: string;
    reason?: string;
  }): Promise<RefundResult>;
  releaseDeposit(params: {
    depositRef: string;
    amountMinor: MinorUnits;
    idempotencyKey: string;
  }): Promise<RefundResult>;
  captureDeposit(params: {
    depositRef: string;
    amountMinor: MinorUnits;
    idempotencyKey: string;
  }): Promise<RefundResult>;
}
