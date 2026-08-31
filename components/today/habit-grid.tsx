"use client";

import { useOptimistic, useRef, useTransition } from "react";
import { Check, Flame } from "lucide-react";
import { toast } from "sonner";
import { adjustHabit } from "@/lib/actions/habits";
import { habitIcon, HABIT_CATEGORIES, streakLength } from "@/lib/domain/habits";
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
            <h3
              id={`habits-${category.key}`}
              className="mb-2 px-1 text-xs font-bold tracking-[0.14em] text-ink-faint uppercase"
            >
              {category.label}
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
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
  const Icon = habitIcon(habit.icon);
  const complete = count >= habit.target_per_day;
  const partial = count > 0 && !complete;

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onTap(habit, ref.current)}
      aria-pressed={complete}
      className={cn(
        "group relative flex min-h-[92px] cursor-pointer flex-col items-start gap-2 rounded-3xl border p-3.5 text-left",
        "transition-[background-color,border-color,box-shadow] duration-200 active:scale-[0.98]",
        complete
          ? "border-transparent bg-[var(--pink-deep)] text-white shadow-[0_8px_22px_-10px_rgb(219_39_119/0.7)]"
          : "border-line bg-surface text-ink hover:border-line-strong",
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-xl transition-colors duration-200",
            complete ? "bg-white/20 text-white" : "bg-surface-2 text-[var(--pink-deep)]",
          )}
        >
          {complete ? (
            <Check className="size-4.5" aria-hidden />
          ) : (
            <Icon className="size-4.5" aria-hidden />
          )}
        </span>

        {habit.target_per_day > 1 ? (
          <span
            className={cn(
              "tnum rounded-full px-2 py-0.5 text-[11px] font-bold",
              complete ? "bg-white/20 text-white" : "bg-surface-2 text-ink-soft",
            )}
          >
            {count}/{habit.target_per_day}
          </span>
        ) : streak >= 2 ? (
          <span
            className={cn(
              "tnum flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold",
              complete ? "bg-white/20 text-white" : "bg-surface-2 text-[var(--gold)]",
            )}
          >
            <Flame className="size-3" aria-hidden />
            {streak}
          </span>
        ) : null}
      </div>

      <div className="min-w-0">
        <p className="text-sm leading-tight font-semibold">{habit.label}</p>
        {habit.hint ? (
          <p
            className={cn(
              "mt-0.5 line-clamp-1 text-[11px] leading-tight",
              complete ? "text-white/70" : "text-ink-faint",
            )}
          >
            {partial ? `${count} of ${habit.target_per_day} done` : habit.hint}
          </p>
        ) : null}
      </div>
    </button>
  );
}
