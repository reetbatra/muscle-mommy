import Link from "next/link";
import { Bed, ChevronRight, Dumbbell, Footprints, Moon, Play } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StepsCard({
  steps,
  target,
  sleepMinutes,
  activeKcal,
}: {
  steps: number | null;
  target: number;
  sleepMinutes: number | null;
  activeKcal: number | null;
}) {
  return (
    <section className="card flex items-center gap-5 p-5" aria-labelledby="steps-heading">
      <ProgressRing
        value={steps ?? 0}
        max={target}
        size={88}
        thickness={9}
        color="var(--lilac-deep)"
        label="Steps against target"
      >
        <Footprints className="size-4 text-[var(--lilac-deep)]" aria-hidden />
        <span className="tnum font-display mt-0.5 text-lg leading-none font-bold text-ink">
          {steps === null ? "—" : steps.toLocaleString()}
        </span>
      </ProgressRing>

      <div className="min-w-0 flex-1">
        <h2 id="steps-heading" className="font-display text-lg font-semibold text-ink">
          Movement
        </h2>
        {steps === null ? (
          <p className="mt-1 text-[15px] text-ink-soft">
            Not synced.{" "}
            <Link href="/settings" className="text-[var(--accent)] underline">
              Connect Health
            </Link>
          </p>
        ) : (
          <p className="tnum mt-1 text-[15px] text-ink-soft">
            {steps >= target
              ? "Goal met"
              : `${(target - steps).toLocaleString()} to go`}
          </p>
        )}

        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
          {activeKcal !== null ? (
            <div className="flex items-center gap-1.5">
              <dt className="text-ink-faint">Burned</dt>
              <dd className="tnum font-bold text-ink">{activeKcal} kcal</dd>
            </div>
          ) : null}
          {sleepMinutes !== null ? (
            <div className="flex items-center gap-1.5">
              <Moon className="size-3 text-ink-faint" aria-hidden />
              <dt className="sr-only">Sleep</dt>
              <dd className="tnum font-bold text-ink">
                {Math.floor(sleepMinutes / 60)}h {sleepMinutes % 60}m
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </section>
  );
}

export function NextWorkoutCard({
  day,
  openSessionId,
  state,
  exerciseCount,
}: {
  day: { id: string; name: string; subtitle: string | null } | null;
  openSessionId: string | null;
  state: "done" | "rest" | "next";
  exerciseCount: number;
}) {
  if (openSessionId) {
    return (
      <Link
        href={`/lift/session/${openSessionId}`}
        className="glitter-fill shimmer block cursor-pointer rounded-[2px] p-5 text-white shadow-[0_12px_30px_-12px_rgb(219_39_119/0.65)]"
      >
        <p className="text-xs font-bold tracking-[0.14em] uppercase opacity-90">In progress</p>
        <p className="font-display mt-1.5 text-2xl leading-tight font-bold">
          Finish your session
        </p>
        <p className="mt-1 flex items-center gap-1 text-[15px] opacity-90">
          Continue
          <ChevronRight className="size-4" aria-hidden />
        </p>
      </Link>
    );
  }

  if (state === "done") {
    return (
      <section className="card">
        <p className="eyebrow">Today</p>
        <h2 className="font-display mt-2 text-[30px] leading-tight text-ink">Done</h2>
        <p className="hand mt-2 text-[20px]">that is the work</p>
      </section>
    );
  }

  if (state === "rest") {
    return (
      <section className="card">
        <p className="eyebrow">Today</p>
        <h2 className="font-display mt-2 flex items-center gap-3 text-[30px] leading-tight text-ink">
          <Bed className="size-6 text-[var(--accent)]" aria-hidden />
          Rest
        </h2>
        <p className="mt-2 text-[15px] text-ink-soft">Walk, eat, sleep.</p>
      </section>
    );
  }

  if (!day) {
    return (
      <section className="card p-5">
        <h2 className="font-display text-lg font-semibold text-ink">No split yet</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Build your four days and the app starts tracking overload from your first session.
        </p>
        <Link
          href="/lift"
          className={cn(buttonVariants({ variant: "soft", size: "md" }), "mt-4 w-full")}
        >
          Set up my split
        </Link>
      </section>
    );
  }

  return (
    <section className="card p-5" aria-labelledby="next-workout-heading">
      <div className="flex items-start gap-4">
        <div className="glitter-fill flex size-12 shrink-0 items-center justify-center rounded-[2px] text-white">
          <Dumbbell className="size-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-[0.14em] text-ink-faint uppercase">Next up</p>
          <h2
            id="next-workout-heading"
            className="font-display mt-0.5 text-xl leading-tight font-semibold text-ink"
          >
            {day.name}
          </h2>
          <p className="tnum mt-1 text-[15px] text-ink-faint">
            {exerciseCount} {exerciseCount === 1 ? "lift" : "lifts"}
          </p>
        </div>
      </div>

      <Link
        href={`/lift/${day.id}`}
        className={cn(buttonVariants({ variant: "glitter", size: "lg", block: true }), "mt-4")}
      >
        <Play className="size-4" aria-hidden />
        Start
      </Link>
    </section>
  );
}
