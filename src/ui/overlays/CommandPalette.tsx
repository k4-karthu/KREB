'use client';

import { MagnifyingGlass } from '@phosphor-icons/react';
import { Command as Cmdk } from 'cmdk';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

export interface CommandPaletteAction {
  id: string;
  label: string;
  group?: string;
  icon?: ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions?: CommandPaletteAction[];
  placeholder?: string;
  emptyText?: string;
  children?: ReactNode;
  className?: string;
}

export function CommandPalette({
  open,
  onOpenChange,
  actions = [],
  placeholder = 'Type a command or search...',
  emptyText = 'No matching commands found.',
  children,
  className = '',
}: CommandPaletteProps) {
  // Listen for Cmd+K and Ctrl+K shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Group actions by group key
  const groups = actions.reduce<Record<string, CommandPaletteAction[]>>((acc, action) => {
    const groupName = action.group ?? 'Commands';
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(action);
    return acc;
  }, {});

  return (
    <Cmdk.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command palette"
      className={`fixed top-1/2 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-l border border-border bg-surface-raised shadow-e3 focus:outline-none ${className}`.trim()}
      overlayClassName="fixed inset-0 z-50 bg-[rgb(var(--shadow-ink)/0.6)]"
    >
      <div className="flex items-center border-b border-border-subtle px-4">
        <MagnifyingGlass size={20} className="text-text-3 shrink-0" />
        <Cmdk.Input
          placeholder={placeholder}
          className="h-13 w-full bg-transparent px-3 text-body text-text-1 placeholder:text-text-disabled focus:outline-none"
        />
        <kbd className="rounded-xs border border-border-subtle bg-surface-sunken px-1.5 py-0.5 text-label-s text-text-3">
          Esc
        </kbd>
      </div>

      <Cmdk.List className="max-h-80 overflow-y-auto p-2">
        <Cmdk.Empty className="py-8 text-center text-body-s text-text-3">{emptyText}</Cmdk.Empty>

        {children}

        {Object.entries(groups).map(([groupName, groupActions]) => (
          <Cmdk.Group
            key={groupName}
            heading={groupName}
            className="px-2 py-1 text-label-s text-text-3 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-medium"
          >
            {groupActions.map((action) => (
              <Cmdk.Item
                key={action.id}
                onSelect={() => {
                  action.onSelect();
                  onOpenChange(false);
                }}
                className="flex items-center justify-between rounded-xs px-3 py-2 text-body-s text-text-2 transition-colors cursor-pointer hover:bg-surface-sunken hover:text-text-1 aria-selected:bg-accent-subtle aria-selected:text-accent"
              >
                <div className="flex items-center gap-2.5">
                  {action.icon && <span className="shrink-0">{action.icon}</span>}
                  <span>{action.label}</span>
                </div>
                {action.shortcut && (
                  <kbd className="rounded-xs border border-border-subtle bg-surface-sunken px-1.5 py-0.5 text-label-s text-text-3">
                    {action.shortcut}
                  </kbd>
                )}
              </Cmdk.Item>
            ))}
          </Cmdk.Group>
        ))}
      </Cmdk.List>

      <div className="flex items-center justify-between border-t border-border-subtle bg-surface-sunken/40 px-4 py-2 text-label-s text-text-3">
        <span>Navigation: ↑ ↓ arrows</span>
        <span>Select: ↵ enter</span>
      </div>
    </Cmdk.Dialog>
  );
}

export const CommandRoot = Cmdk;
export const CommandDialog = Cmdk.Dialog;
export const CommandInput = Cmdk.Input;
export const CommandList = Cmdk.List;
export const CommandEmpty = Cmdk.Empty;
export const CommandGroup = Cmdk.Group;
export const CommandItem = Cmdk.Item;
export const CommandSeparator = Cmdk.Separator;
