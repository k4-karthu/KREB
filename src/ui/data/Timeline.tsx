'use client';

import { Check } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

export type TimelineEventStatus = 'completed' | 'active' | 'pending';

export interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  description?: ReactNode;
  status?: TimelineEventStatus;
  badge?: ReactNode;
}

export interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

/**
 * Kerb v3 Timeline:
 * Vertical event timeline featuring status indicator dots and connecting lane line.
 */
export function Timeline({ events, className = '' }: TimelineProps) {
  return (
    <div className={`relative ${className}`.trim()}>
      <ol className="relative space-y-6">
        {events.map((event, index) => {
          const isLast = index === events.length - 1;
          const status = event.status ?? 'pending';

          return (
            <li key={event.id} className="relative flex items-start gap-4">
              {/* Connector line between dots */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="absolute top-5 left-3 -ml-px h-full w-0.5 bg-border"
                />
              )}

              {/* Event Dot */}
              <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
                {status === 'completed' && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-white shadow-e0">
                    <Check size={12} weight="bold" />
                  </span>
                )}
                {status === 'active' && (
                  <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-accent ring-4 ring-accent-subtle" />
                  </span>
                )}
                {status === 'pending' && (
                  <span className="h-3 w-3 rounded-full border-2 border-border bg-surface-sunken" />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-display text-body font-semibold text-text-1">
                    {event.title}
                  </h4>
                  <time className="text-label-s text-text-3 tabular-nums">{event.time}</time>
                </div>

                {event.description && (
                  <div className="mt-1 text-body-s text-text-2">{event.description}</div>
                )}

                {event.badge && <div className="mt-2">{event.badge}</div>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
