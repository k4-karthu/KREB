'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useId } from 'react';
import {
  Tab as AriaTab,
  TabList as AriaTabList,
  TabPanel as AriaTabPanel,
  Tabs as AriaTabs,
  type Key,
} from 'react-aria-components';
import { SPRING } from '../tokens/motion';

export interface TabItemData {
  id: string;
  label: ReactNode;
  content?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItemData[];
  selectedKey?: string | number;
  defaultSelectedKey?: string | number;
  onSelectionChange?: (key: Key) => void;
  className?: string;
  tabListClassName?: string;
}

/**
 * Kerb v3 Tabs:
 * React Aria Tabs with animated sliding Cobalt underline using motion.
 */
export function Tabs({
  items,
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  className = '',
  tabListClassName = '',
}: TabsProps) {
  const uniqueId = useId();
  const layoutId = `kerb-tabs-underline-${uniqueId}`;

  return (
    <AriaTabs
      selectedKey={selectedKey}
      defaultSelectedKey={defaultSelectedKey ?? items[0]?.id}
      onSelectionChange={onSelectionChange}
      className={`w-full ${className}`.trim()}
    >
      <AriaTabList
        aria-label="Tabs"
        className={`relative flex items-center gap-6 border-b border-border-subtle ${tabListClassName}`.trim()}
      >
        {items.map((item) => (
          <AriaTab
            key={item.id}
            id={item.id}
            isDisabled={item.disabled}
            className="group relative cursor-pointer py-3 text-label-m font-medium text-text-3 transition-colors outline-none hover:text-text-1 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40 disabled:cursor-not-allowed data-[selected]:text-accent"
          >
            {({ isSelected }) => (
              <>
                <span>{item.label}</span>
                {isSelected && (
                  <motion.span
                    layoutId={layoutId}
                    transition={{ type: 'spring', ...SPRING.ui }}
                    className="absolute right-0 bottom-0 left-0 h-0.5 bg-accent"
                  />
                )}
              </>
            )}
          </AriaTab>
        ))}
      </AriaTabList>

      {items.map(
        (item) =>
          item.content && (
            <AriaTabPanel
              key={item.id}
              id={item.id}
              className="py-4 text-body text-text-1 focus:outline-none"
            >
              {item.content}
            </AriaTabPanel>
          ),
      )}
    </AriaTabs>
  );
}

export const TabsRoot = AriaTabs;
export const TabList = AriaTabList;
export const Tab = AriaTab;
export const TabPanel = AriaTabPanel;
