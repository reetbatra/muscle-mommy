import Link from "next/link";
import { Bed, ChevronRight, Dumbbell, Play } from "lucide-react";
import { Sparkle } from "@/components/ui/sparkle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        className="block cursor-pointer border border-[var(--accent)] p-5 text-ink"
      >
        <p className="eyebrow" style={{ color: "var(--accent)" }}>
          In progress
        </p>
        <p className="font-display mt-1.5 text-[26px] leading-tight text-ink">
          Finish your session
        </p>
        <p className="mt-1 flex items-center gap-1 text-[15px] text-ink-soft">
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
        <p className="hand mt-2 flex items-center gap-2 text-[20px]">
          that is the work
          <Sparkle size={13} twinkle />
        </p>
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
        <div className="flex size-12 shrink-0 items-center justify-center border border-line bg-surface text-[var(--accent)]">
          <Dumbbell className="size-6" strokeWidth={1.6} aria-hidden />
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
