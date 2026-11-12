'use client';

/*
 * Thermal receipt printer shell.
 * Slot & feed framing adapted from aqkprogrammer/receipt-printer
 * (MIT License, Copyright (c) 2026 Abdul Qadir Khan).
 */

import { motion, useReducedMotion } from 'motion/react';
import type React from 'react';
import { RECEIPT_MAX_WIDTH } from './constants';

export interface ReceiptPrinterProps {
  /** Whether the thermal head is actively feeding paper */
  isPrinting?: boolean;
  /** Optional short status label shown next to the LED */
  statusText?: string;
  /** Optional header action (e.g. sound toggle or reprint trigger) */
  headerAction?: React.ReactNode;
  /** The ReceiptPaper element emerging from the bottom slot */
  children?: React.ReactNode;
  className?: string;
}

export function ReceiptPrinter({
  isPrinting = false,
  statusText,
  headerAction,
  children,
  className = '',
}: ReceiptPrinterProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`relative flex flex-col items-center w-full ${className}`}>
      {/* Machine housing — sits above the emerging paper */}
      <section
        aria-label="Receipt printer"
        className="relative z-10 w-full px-4 pt-3 pb-0"
        style={{
          maxWidth: `${RECEIPT_MAX_WIDTH + 60}px`,
          borderRadius: 'var(--radius-m)',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-e2)',
        }}
      >
        {/* Top bar: KERB brand mark + LED indicator + optional action */}
        <div className="flex items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-2">
            <motion.span
              aria-hidden="true"
              className="inline-block shrink-0"
              style={{
                width: '6px',
                height: '6px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--success)',
                boxShadow: isPrinting ? '0 0 8px var(--success)' : 'none',
              }}
              animate={
                isPrinting && !prefersReducedMotion
                  ? { opacity: [1, 0.35, 1], scale: [1, 1.2, 1] }
                  : { opacity: 1, scale: 1 }
              }
              transition={
                isPrinting && !prefersReducedMotion
                  ? { duration: 0.7, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
                  : { duration: 0.16 }
              }
            />
            <span
              className="font-mono font-semibold"
              style={{
                fontSize: '10px',
                letterSpacing: '0.18em',
                color: 'var(--text-3)',
              }}
            >
              KERB
            </span>
          </div>

          <div className="flex items-center gap-2">
            {statusText ? (
              <span
                className="font-mono"
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  color: 'var(--text-3)',
                }}
              >
                {statusText}
              </span>
            ) : null}
            {headerAction}
          </div>
        </div>

        {/* Paper-feed slot at bottom of machine */}
        <div
          aria-hidden="true"
          className="mx-auto mb-2.5 flex items-center justify-center"
          style={{
            width: 'calc(100% - 8px)',
            maxWidth: `${RECEIPT_MAX_WIDTH + 12}px`,
            height: '4px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--border-subtle)',
            boxShadow: 'inset 0 1px 2px rgb(var(--shadow-ink) / 0.16)',
          }}
        />
      </section>

      {/* Emerging paper container — tucked slightly behind the slot mouth */}
      {children ? (
        <div className="relative z-0 flex justify-center w-full" style={{ marginTop: '-6px' }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
