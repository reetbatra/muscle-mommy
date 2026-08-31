"use client";

import { useState, useTransition } from "react";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import { setPagesRead } from "@/lib/actions/habits";
import { NumberStepper } from "@/components/ui/field";
import { ProgressBar } from "@/components/ui/progress-bar";

export function PagesRead({
  today,
  initialPages,
  target,
}: {
  today: string;
  initialPages: number;
  target: number;
}) {
  const [pages, setPages] = useState(initialPages);
  const [, startTransition] = useTransition();

  function commit(next: number) {
    setPages(next);
    startTransition(async () => {
      try {
        await setPagesRead({ date: today, pages: next });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save that.");
      }
    });
  }

  return (
    <section className="card p-5" aria-labelledby="pages-heading">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-[2px] bg-surface-2 text-[var(--accent)]">
            <BookOpen className="size-5" aria-hidden />
          </div>
          <div>
            <h2 id="pages-heading" className="font-display text-base font-semibold text-ink">
              Pages read
            </h2>
            <p className="tnum text-xs text-ink-faint">
              {pages} of {target} today
            </p>
          </div>
        </div>
        <NumberStepper
          value={pages}
          onChange={commit}
          min={0}
          max={2000}
          step={1}
          label="Pages read today"
          size="sm"
          className="w-[136px]"
        />
      </div>
      <ProgressBar
        value={pages}
        max={target}
        color="var(--accent-soft)"
        label={`Pages read: ${pages} of ${target}`}
        className="mt-4"
      />
    </section>
  );
}
