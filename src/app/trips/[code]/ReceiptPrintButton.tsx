'use client';

import { Printer } from 'lucide-react';
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
      <Printer className="h-3.5 w-3.5" />
      <span>Print / Save receipt</span>
    </Button>
  );
}
