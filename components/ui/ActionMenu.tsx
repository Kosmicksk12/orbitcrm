"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { IconMoreVertical } from "@/components/ui/Icons";

export interface ActionMenuItem {
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

/** Compact "⋯" trigger that opens a small anchored menu of secondary actions.
 * Used to keep row/card action rows from turning into a strip of loose icon
 * buttons — only the primary action stays visible, the rest live here. */
export function ActionMenu({ items, label = "Más acciones" }: { items: ActionMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-lg p-2 text-ink-muted hover:bg-bg hover:text-ink dark:hover:bg-white/5 dark:hover:text-ink-dark"
      >
        <IconMoreVertical width={16} height={16} />
      </button>

      {open && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full z-20 mt-1 w-48 animate-fade-in rounded-xl border border-line bg-surface p-1 shadow-popover dark:border-line-dark dark:bg-surface-dark"
        >
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              disabled={item.disabled}
              title={item.disabled ? item.disabledReason : undefined}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                item.disabled
                  ? "cursor-not-allowed text-ink-muted/50 dark:text-ink-dark-muted/40"
                  : item.danger
                    ? "text-danger hover:bg-danger-soft dark:hover:bg-danger/10"
                    : "text-ink hover:bg-bg dark:text-ink-dark dark:hover:bg-white/5"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
