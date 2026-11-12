'use client';

import { Printer } from '@phosphor-icons/react';
import { Button } from '@/ui/primitives/Button';

export function ReceiptPrintButton() {
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={() => window.print()}
      className="print:hidden"
    >
      <Printer size={16} weight="bold" />
      <span>Print / export thermal receipt</span>
    </Button>
  );
}
