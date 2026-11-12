'use client';

/*
 * Full animated thermal receipt assembly:
 * ReceiptPrinter + feeding ReceiptPaper + drag/keyboard tear + post-tear actions.
 */

import { Download, RotateCcw, Scissors, Share2, SkipForward } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { ReceiptPrinter } from './ReceiptPrinter';
import { ReceiptPaper } from './receipt-paper';
import type { SlipData } from './types';
import { useReceiptSim } from './use-receipt-sim';

const TEAR_DRAG_THRESHOLD_PX = 70;

export interface ReceiptAnimationProps {
  slip: SlipData;
  autoPrint?: boolean;
  onDownloadPdf?: (slip: SlipData) => void;
  onShare?: (slip: SlipData) => void;
  className?: string;
}

export function ReceiptAnimation({
  slip,
  autoPrint = true,
  onDownloadPdf,
  onShare,
  className = '',
}: ReceiptAnimationProps) {
  const { state, print, skip, tear, reset } = useReceiptSim({
    lineCount: slip.lines.length + slip.meta.length,
    autoPrint,
  });

  const [dragY, setDragY] = useState(0);
  const dragStartRef = useRef<number | null>(null);

  const isPrinting = state.phase === 'feeding' || state.phase === 'shaking';
  const canTear = state.phase === 'ready';
  const isTorn = state.phase === 'torn';

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!canTear) return;
      dragStartRef.current = e.clientY;
      setDragY(0);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore capture failure on synthetic pointer events
      }
    },
    [canTear],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragStartRef.current === null || !canTear) return;
      const dy = Math.max(0, e.clientY - dragStartRef.current);
      setDragY(Math.min(dy, TEAR_DRAG_THRESHOLD_PX * 1.6));
    },
    [canTear],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragStartRef.current === null) return;
      const dy = Math.max(0, e.clientY - dragStartRef.current);
      dragStartRef.current = null;
      setDragY(0);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore release failure
      }
      if (dy >= TEAR_DRAG_THRESHOLD_PX) {
        tear();
      }
    },
    [tear],
  );

  const shakeX =
    state.phase === 'shaking' ? Math.sin(state.elapsedMs * 0.08) * state.shakeIntensity * 2.5 : 0;
  const fallOffset = state.phase === 'tearing' ? 28 : isTorn ? 12 : 0;
  const fallRotate =
    state.phase === 'tearing' ? 3 : dragY > 0 ? (dragY / TEAR_DRAG_THRESHOLD_PX) * 0.8 : 0;

  const statusText =
    state.phase === 'feeding'
      ? 'FEEDING'
      : state.phase === 'shaking'
        ? 'SETTLING'
        : state.phase === 'ready'
          ? 'READY'
          : isTorn
            ? 'FILED'
            : 'IDLE';

  return (
    <div className={`flex flex-col items-center gap-4 w-full ${className}`}>
      <ReceiptPrinter
        isPrinting={isPrinting}
        statusText={statusText}
        headerAction={
          isPrinting ? (
            <button
              type="button"
              onClick={skip}
              className="inline-flex items-center gap-1 px-2 py-1 font-medium cursor-pointer"
              style={{
                fontSize: '11px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--surface-sunken)',
                color: 'var(--text-2)',
                border: '1px solid var(--border)',
              }}
            >
              <SkipForward size={12} aria-hidden="true" />
              Skip
            </button>
          ) : state.phase === 'idle' ? (
            <button
              type="button"
              onClick={print}
              className="inline-flex items-center gap-1 px-2.5 py-1 font-medium cursor-pointer"
              style={{
                fontSize: '11px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--accent)',
                color: 'var(--on-accent)',
              }}
            >
              Print slip
            </button>
          ) : null
        }
      >
        {state.phase !== 'idle' ? (
          <section
            aria-label={
              canTear ? 'Thermal receipt slip, drag down to tear off' : 'Thermal receipt slip'
            }
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              dragStartRef.current = null;
              setDragY(0);
            }}
            className="w-full flex justify-center outline-none"
            style={{
              touchAction: canTear ? 'none' : 'auto',
              cursor: canTear ? (dragY > 0 ? 'grabbing' : 'grab') : 'default',
              overflow: 'hidden',
              maxHeight: state.phase === 'feeding' ? `${Math.max(48, state.paperY)}px` : '1400px',
              transform: `translate3d(${shakeX.toFixed(2)}px, ${dragY + fallOffset}px, 0) rotate(${fallRotate.toFixed(2)}deg)`,
              transition:
                dragY > 0 || isPrinting
                  ? 'none'
                  : 'transform 260ms var(--ease-out), max-height 160ms var(--ease-out)',
            }}
          >
            <ReceiptPaper slip={slip} tornTop={isTorn || state.phase === 'tearing'} tornBottom />
          </section>
        ) : null}
      </ReceiptPrinter>

      {/* Controls below paper */}
      {canTear ? (
        <button
          type="button"
          onClick={tear}
          className="inline-flex items-center gap-2 px-4 py-2 font-medium cursor-pointer"
          style={{
            fontSize: '13px',
            borderRadius: 'var(--radius-s)',
            backgroundColor: 'var(--surface)',
            color: 'var(--text-1)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-e1)',
          }}
        >
          <Scissors size={14} aria-hidden="true" />
          Tear off slip
        </button>
      ) : null}

      {isTorn ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onDownloadPdf?.(slip)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 font-medium cursor-pointer"
            style={{
              fontSize: '13px',
              borderRadius: 'var(--radius-s)',
              backgroundColor: 'var(--accent)',
              color: 'var(--on-accent)',
            }}
          >
            <Download size={14} aria-hidden="true" />
            Download PDF
          </button>
          <button
            type="button"
            onClick={() => onShare?.(slip)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 font-medium cursor-pointer"
            style={{
              fontSize: '13px',
              borderRadius: 'var(--radius-s)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-1)',
              border: '1px solid var(--border)',
            }}
          >
            <Share2 size={14} aria-hidden="true" />
            Share
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
              print();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 font-medium cursor-pointer"
            style={{
              fontSize: '13px',
              borderRadius: 'var(--radius-s)',
              backgroundColor: 'var(--surface-sunken)',
              color: 'var(--text-2)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Reprint
          </button>
        </div>
      ) : null}
    </div>
  );
}
