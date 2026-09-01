"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysISO, EDITABLE_DAYS, prettyDate } from "@/lib/domain/dates";

/**
 * Moves a screen between days.
 *
 * Forward is disabled on today rather than hidden, so the control does not
 * shift around under your thumb. Tapping the label opens the native date
 * picker, which beats stepping back twenty times.
 */
export function DateNav({
  date,
  today,
  className,
}: {
  date: string;
  today: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const go = (next: string) => {
    router.push(next === today ? pathname : `${pathname}?d=${next}`);
  };

  const earliest = addDaysISO(today, -EDITABLE_DAYS);
  const canGoBack = date > earliest;
  const canGoForward = date < today;

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <button
        type="button"
        aria-label="Previous day"
        disabled={!canGoBack}
        onClick={() => go(addDaysISO(date, -1))}
        className="flex size-10 cursor-pointer items-center justify-center text-ink-soft transition-colors duration-150 hover:text-ink disabled:opacity-30"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>

      <label className="relative cursor-pointer">
        <span className="eyebrow whitespace-nowrap">{prettyDate(date, today)}</span>
        <input
          type="date"
          value={date}
          max={today}
          min={earliest}
          aria-label="Jump to a day"
          onChange={(e) => e.target.value && go(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>

      <button
        type="button"
        aria-label="Next day"
        disabled={!canGoForward}
        onClick={() => go(addDaysISO(date, 1))}
        className="flex size-10 cursor-pointer items-center justify-center text-ink-soft transition-colors duration-150 hover:text-ink disabled:opacity-30"
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </div>
  );
}
