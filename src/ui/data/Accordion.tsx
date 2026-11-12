'use client';

import { CaretDown } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import {
  Button as AriaButton,
  Disclosure as AriaDisclosure,
  DisclosureGroup as AriaDisclosureGroup,
  DisclosurePanel as AriaDisclosurePanel,
  Heading as AriaHeading,
  type Key,
} from 'react-aria-components';
import { DUR, EASE } from '../tokens/motion';

export interface AccordionItemData {
  id: string;
  title: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItemData[];
  allowsMultiple?: boolean;
  expandedKeys?: 'all' | Iterable<Key>;
  defaultExpandedKeys?: 'all' | Iterable<Key>;
  onExpandedChange?: (keys: Set<Key>) => void;
  className?: string;
}

/**
 * Kerb v3 Accordion:
 * React Aria DisclosureGroup with rotating chevron and animated height expansion.
 */
export function Accordion({
  items,
  allowsMultiple = false,
  expandedKeys,
  defaultExpandedKeys,
  onExpandedChange,
  className = '',
}: AccordionProps) {
  return (
    <AriaDisclosureGroup
      allowsMultipleExpanded={allowsMultiple}
      expandedKeys={expandedKeys}
      defaultExpandedKeys={defaultExpandedKeys}
      onExpandedChange={onExpandedChange}
      className={`divide-y divide-border-subtle border-y border-border-subtle ${className}`.trim()}
    >
      {items.map((item) => (
        <AriaDisclosure key={item.id} id={item.id} isDisabled={item.disabled} className="group">
          <AriaHeading level={3}>
            <AriaButton
              slot="trigger"
              className="flex w-full cursor-pointer items-center justify-between py-4 text-left font-display text-body font-semibold text-text-1 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>{item.title}</span>
              <span
                aria-hidden="true"
                className="text-text-3 transition-transform duration-200 ease-out group-data-[expanded]:rotate-180"
              >
                <CaretDown size={18} weight="bold" />
              </span>
            </AriaButton>
          </AriaHeading>

          <AriaDisclosurePanel className="overflow-hidden">
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              transition={{ duration: DUR.fast / 1000, ease: EASE.out }}
              className="overflow-hidden"
            >
              <div className="pt-0.5 pb-4 text-body-s text-text-2">{item.content}</div>
            </motion.div>
          </AriaDisclosurePanel>
        </AriaDisclosure>
      ))}
    </AriaDisclosureGroup>
  );
}

export const AccordionRoot = AriaDisclosureGroup;
export const AccordionItem = AriaDisclosure;
export const AccordionHeading = AriaHeading;
export const AccordionTrigger = AriaButton;
export const AccordionPanel = AriaDisclosurePanel;
