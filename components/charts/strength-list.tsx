import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import type { ExerciseTrend } from "@/lib/progress";
import { trimNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * A table beats another chart here: what you want to know is the working
 * weight on each lift right now, and whether it moved.
 */
export function StrengthList({ exercises }: { exercises: ExerciseTrend[] }) {
  if (exercises.length === 0) {
    return (
      <section className="card p-5">
        <h2 className="font-display text-base font-semibold text-ink">Every lift</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          Finish a session and each exercise shows up here with its current working weight.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-5" aria-labelledby="strength-heading">
      <h2 id="strength-heading" className="font-display text-base font-semibold text-ink">
        Every lift
      </h2>
      <p className="mt-0.5 text-sm text-ink-soft">
        Working weight now, and how it changed since the session before.
      </p>

      <ul className="mt-4 divide-y divide-[var(--border)]">
        {exercises.map((exercise) => {
          const delta =
            exercise.previousWeight !== null ? exercise.currentWeight - exercise.previousWeight : null;
          const e1rmChange =
            exercise.firstE1rm > 0
              ? ((exercise.currentE1rm - exercise.firstE1rm) / exercise.firstE1rm) * 100
              : 0;

          return (
            <li key={exercise.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{exercise.name}</p>
                <p className="tnum text-xs text-ink-faint">
                  {exercise.sessions} {exercise.sessions === 1 ? "session" : "sessions"}
                  {exercise.sessions > 1 && Math.abs(e1rmChange) >= 1
                    ? ` · estimated max ${e1rmChange > 0 ? "up" : "down"} ${Math.abs(Math.round(e1rmChange))}%`
                    : ""}
                </p>
              </div>

              <span className="tnum shrink-0 text-sm font-bold text-ink">
                {exercise.currentWeight > 0 ? `${trimNumber(exercise.currentWeight)}kg` : "Bodyweight"}
              </span>

              <span
                className={cn(
                  "flex w-14 shrink-0 items-center justify-end gap-0.5 text-xs font-bold",
                  delta === null && "text-ink-faint",
                  delta !== null && delta > 0 && "text-[var(--mint)]",
                  delta !== null && delta === 0 && "text-ink-faint",
                  delta !== null && delta < 0 && "text-[var(--coral)]",
                )}
              >
                {delta === null ? (
                  "new"
                ) : delta > 0 ? (
                  <>
                    <ArrowUp className="size-3" aria-hidden />
                    {trimNumber(delta)}
                  </>
                ) : delta < 0 ? (
                  <>
                    <ArrowDown className="size-3" aria-hidden />
                    {trimNumber(Math.abs(delta))}
                  </>
                ) : (
                  <ArrowRight className="size-3" aria-hidden />
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
