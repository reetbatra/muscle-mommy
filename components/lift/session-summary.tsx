import Link from "next/link";
import { ArrowLeft, Flame, Timer, TrendingUp } from "lucide-react";
import { Sparkle } from "@/components/ui/sparkle";
import { VerdictPill } from "./prescription-badge";
import { buttonVariants } from "@/components/ui/button";
import { describeSets, type ExerciseComparison, type LoadType, type LoggedSet } from "@/lib/domain/overload";
import { cn } from "@/lib/utils";

export type SummaryItem = {
  id: string;
  name: string;
  loadType: LoadType;
  sets: LoggedSet[];
  comparison: ExerciseComparison;
};

export function SessionSummary({
  title,
  dateLabel,
  minutes,
  estimatedKcal,
  score,
  items,
  notes,
}: {
  title: string;
  dateLabel: string;
  minutes: number | null;
  estimatedKcal: number | null;
  score: { up: number; scored: number; pct: number };
  items: SummaryItem[];
  notes: string | null;
}) {
  return (
    <>
      <div className="pt-5">
        <Link
          href="/lift"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors duration-200 hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Split
        </Link>
      </div>

      <header className="pt-3 pb-5">
        <p className="text-xs font-semibold tracking-[0.14em] text-ink-faint uppercase">
          {dateLabel}
        </p>
        <h1 className="font-display mt-1 text-[27px] leading-tight font-semibold text-ink">
          {title}
        </h1>
      </header>

      <section className="card p-5" aria-labelledby="overload-score">
        <div className="flex items-center gap-2 text-[var(--accent)]">
          <TrendingUp className="size-4" aria-hidden />
          <h2 id="overload-score" className="text-xs font-bold tracking-[0.14em] uppercase">
            Overload
          </h2>
        </div>
        <p className="font-display mt-2 flex items-center gap-2.5 text-3xl leading-none text-ink">
          <span className="tnum">{score.pct}%</span>
          {score.pct >= 50 ? <Sparkle size={18} twinkle /> : null}
        </p>
        <p className="mt-1.5 text-[15px] text-ink-soft">
          {score.scored === 0
            ? "Nothing to compare against yet. Next time there will be."
            : `${score.up} of ${score.scored} beat last time.`}
        </p>
        {score.pct >= 80 && score.scored > 1 ? (
          <p className="hand mt-2 text-[21px]">that is a good day</p>
        ) : null}

        {minutes !== null || estimatedKcal !== null ? (
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-sm">
            {minutes !== null ? (
              <div className="flex items-center gap-1.5">
                <Timer className="size-3.5 text-ink-faint" aria-hidden />
                <dt className="sr-only">Duration</dt>
                <dd className="tnum font-bold text-ink">{minutes} min</dd>
              </div>
            ) : null}
            {estimatedKcal !== null ? (
              <div className="flex items-center gap-1.5">
                <Flame className="size-3.5 text-ink-faint" aria-hidden />
                <dt className="sr-only">Estimated energy</dt>
                <dd className="tnum font-bold text-ink">about {estimatedKcal} kcal</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </section>

      {notes ? (
        <p className="card mt-3 p-4 text-sm leading-relaxed text-ink-soft">{notes}</p>
      ) : null}

      <ol className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-base leading-tight font-semibold text-ink">
                {item.name}
              </h3>
            </div>
            <p className="tnum mt-1 text-sm text-ink-soft">
              {describeSets(item.sets, item.loadType)}
            </p>
            <div className="mt-2">
              <VerdictPill verdict={item.comparison.verdict} reason={item.comparison.reason} />
            </div>
          </li>
        ))}
      </ol>

      <Link
        href="/lift"
        className={cn(buttonVariants({ variant: "soft", size: "lg", block: true }), "mt-6")}
      >
        Back to my split
      </Link>
    </>
  );
}
