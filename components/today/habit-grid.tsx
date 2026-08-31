"use client";

import { useOptimistic, useRef, useTransition } from "react";
import { Check, Flame } from "lucide-react";
import { toast } from "sonner";
import { adjustHabit } from "@/lib/actions/habits";
import { HABIT_CATEGORIES, streakLength } from "@/lib/domain/habits";
import { sparkleAt, celebrate } from "@/lib/celebrate";
import { cn } from "@/lib/utils";
import type { Habit } from "@/lib/domain/types";

type Props = {
  habits: Habit[];
  counts: Record<string, number>;
  history: Record<string, string[]>;
  today: string;
};

export function HabitGrid({ habits, counts, history, today }: Props) {
  const [optimisticCounts, setOptimisticCounts] = useOptimistic(
    counts,
    (state: Record<string, number>, update: { id: string; count: number }) => ({
      ...state,
      [update.id]: update.count,
    }),
  );
  const [, startTransition] = useTransition();
  const celebratedRef = useRef(false);

  const done = habits.filter((h) => (optimisticCounts[h.id] ?? 0) >= h.target_per_day).length;

  function onTap(habit: Habit, element: HTMLElement | null) {
    const current = optimisticCounts[habit.id] ?? 0;
    const complete = current >= habit.target_per_day;
    // Tapping a finished habit clears it, which is the only way to undo a
    // mis-tap without a menu.
    const delta = complete ? -habit.target_per_day : 1;
    const next = complete ? 0 : current + 1;

    if (!complete) sparkleAt(element);

    startTransition(async () => {
      setOptimisticCounts({ id: habit.id, count: next });
      try {
        await adjustHabit({ habitId: habit.id, date: today, delta });
        if (next >= habit.target_per_day && done + 1 === habits.length && !celebratedRef.current) {
          celebratedRef.current = true;
          celebrate();
          toast.success("Every habit done today.");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save that.");
      }
    });
  }

  return (
    <div className="space-y-5">
      {HABIT_CATEGORIES.map((category) => {
        const inCategory = habits.filter((h) => h.category === category.key);
        if (inCategory.length === 0) return null;

        return (
          <section key={category.key} aria-labelledby={`habits-${category.key}`}>
            <h3 id={`habits-${category.key}`} className="eyebrow mb-1">
              {category.label}
            </h3>
            <div className="border-t border-line">
              {inCategory.map((habit) => (
                <HabitTile
                  key={habit.id}
                  habit={habit}
                  count={optimisticCounts[habit.id] ?? 0}
                  streak={streakLength(new Set(history[habit.id] ?? []), today)}
                  onTap={onTap}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function HabitTile({
  habit,
  count,
  streak,
  onTap,
}: {
  habit: Habit;
  count: number;
  streak: number;
  onTap: (habit: Habit, element: HTMLElement | null) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const complete = count >= habit.target_per_day;
  const partial = count > 0 && !complete;

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onTap(habit, ref.current)}
      aria-pressed={complete}
      className="flex min-h-[52px] w-full cursor-pointer items-center gap-3.5 border-b border-line py-3 text-left"
    >
      {/* The one thing that stays round. A tick is a tick. */}
      <span
        className={cn(
          "flex size-[22px] shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
          complete
            ? "border-[var(--accent)] bg-[var(--accent)] text-bg"
            : partial
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-line-strong text-transparent",
        )}
      >
        {complete ? <Check className="size-3.5" strokeWidth={2.5} aria-hidden /> : null}
      </span>

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[17px]",
          complete ? "text-ink-faint" : "text-ink",
        )}
      >
        {habit.label}
      </span>

      {habit.target_per_day > 1 ? (
        <span className="tnum shrink-0 text-[13px] text-ink-faint">
          {count}/{habit.target_per_day}
        </span>
      ) : streak >= 2 ? (
        <span className="tnum flex shrink-0 items-center gap-1 text-[13px] text-ink-faint">
          <Flame className="size-3" aria-hidden />
          {streak}
        </span>
      ) : null}
    </button>
  );
}
