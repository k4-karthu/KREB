'use client';

import { Eraser } from '@phosphor-icons/react';
import {
  forwardRef,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Button } from './Button';

export interface SignaturePadRef {
  getSignature: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
}

export interface SignaturePadProps {
  label?: string;
  description?: string;
  error?: string;
  errorMessage?: string;
  height?: number;
  disabled?: boolean;
  onChange?: (dataUrl: string | null) => void;
  className?: string;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(function SignaturePad(
  {
    label = 'Signature',
    description = 'Sign above the line using finger, stylus, or mouse',
    error,
    errorMessage,
    height = 180,
    disabled = false,
    onChange,
    className = '',
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const errorText = error || errorMessage;

  // Canvas resize & Retina DPI setup
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2.5;
      }
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => observer.disconnect();
  }, [height]);

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const getStrokeColor = () => {
    if (typeof window === 'undefined') return 'currentColor';
    const rootStyle = getComputedStyle(document.documentElement);
    const token = rootStyle.getPropertyValue('--text-1').trim();
    return token || 'currentColor';
  };

  const startDrawing = (x: number, y: number) => {
    if (disabled) return;
    setIsDrawing(true);
    lastPoint.current = { x, y };

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = getStrokeColor();
      ctx.beginPath();
      ctx.arc(x, y, 1.25, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }
  };

  const draw = (x: number, y: number) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !lastPoint.current) return;

    ctx.strokeStyle = getStrokeColor();
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastPoint.current = { x, y };
    if (!hasDrawn) {
      setHasDrawn(true);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPoint.current = null;

    const canvas = canvasRef.current;
    if (canvas && onChange) {
      const data = canvas.toDataURL('image/png');
      onChange(data);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasDrawn(false);
    onChange?.(null);
  };

  useImperativeHandle(ref, () => ({
    getSignature: () => {
      if (!hasDrawn || !canvasRef.current) return null;
      return canvasRef.current.toDataURL('image/png');
    },
    clear: handleClear,
    isEmpty: () => !hasDrawn,
  }));

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`.trim()}>
      <div className="flex items-center justify-between select-none">
        {label && <span className="text-caption font-medium text-text-2">{label}</span>}
        {hasDrawn && (
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={handleClear}
            className="text-text-3 hover:text-danger h-8 px-2"
          >
            <Eraser size={14} className="mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div
        ref={containerRef}
        className={`relative w-full rounded-s border bg-surface overflow-hidden ${
          errorText ? 'border-danger' : 'border-border focus-within:border-accent'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-crosshair touch-none"
          onMouseDown={(e: ReactMouseEvent) => {
            const pt = getCanvasPoint(e.clientX, e.clientY);
            startDrawing(pt.x, pt.y);
          }}
          onMouseMove={(e: ReactMouseEvent) => {
            const pt = getCanvasPoint(e.clientX, e.clientY);
            draw(pt.x, pt.y);
          }}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e: ReactTouchEvent) => {
            const touch = e.touches[0];
            if (!touch) return;
            const pt = getCanvasPoint(touch.clientX, touch.clientY);
            startDrawing(pt.x, pt.y);
          }}
          onTouchMove={(e: ReactTouchEvent) => {
            const touch = e.touches[0];
            if (!touch) return;
            const pt = getCanvasPoint(touch.clientX, touch.clientY);
            draw(pt.x, pt.y);
          }}
          onTouchEnd={stopDrawing}
        />

        <div
          className="absolute bottom-6 inset-x-6 border-b border-dashed border-border-subtle pointer-events-none flex justify-between items-end pb-1"
          aria-hidden="true"
        >
          <span className="text-caption text-text-disabled select-none">Sign above line</span>
          <span className="text-caption text-text-disabled select-none font-semibold">×</span>
        </div>
      </div>

      {description && !errorText && <span className="text-caption text-text-3">{description}</span>}

      {errorText && (
        <p role="alert" className="text-caption text-danger font-medium">
          {errorText}
        </p>
      )}
    </div>
  );
});
