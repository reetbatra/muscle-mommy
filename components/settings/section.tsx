"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * `icon` is a rendered element, not a component.
 *
 * A Server Component cannot hand a function across to a Client Component, and
 * a Lucide icon is a function. Passing `icon={Utensils}` from the settings page
 * threw "Functions cannot be passed directly to Client Components" and 500'd
 * the whole screen. An already-rendered element serialises fine.
 */
export function SettingsSection({
  icon,
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  summary: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className="card overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full cursor-pointer items-center gap-3 p-4 text-left transition-colors duration-150 hover:bg-surface-2"
      >
        <span className="flex size-10 shrink-0 items-center justify-center border border-line bg-surface text-[var(--accent)]">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-display block text-base font-semibold text-ink">{title}</span>
          <span className="mt-0.5 block truncate text-sm text-ink-soft">{summary}</span>
        </span>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-ink-faint transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <div id={panelId} hidden={!open} className="border-t border-line p-4">
        {children}
      </div>
    </section>
  );
}
