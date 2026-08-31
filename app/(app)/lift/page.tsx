import type { Metadata } from "next";
import Link from "next/link";
import { Bed, ChevronRight, Dumbbell, Pencil } from "lucide-react";
import { getRoutine, getSessionContext, getTodayData } from "@/lib/data";
import { addDaysISO } from "@/lib/domain/dates";
import { nextRoutineDay } from "@/lib/domain/schedule";
import { Screen, ScreenHeader } from "@/components/screen";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Lift" };
export const dynamic = "force-dynamic";

const ACCENT: Record<string, string> = {
  pink: "var(--accent)",
  lilac: "var(--accent-soft)",
  cyan: "var(--accent-soft)",
  mint: "var(--good)",
};

export default async function LiftPage() {
  const ctx = await getSessionContext();
  const [routine, data] = await Promise.all([
    getRoutine(),
    getTodayData(ctx.today, addDaysISO(ctx.today, -7)),
  ]);

  const scheduleDays = routine.map((d) => ({
    id: d.id,
    day_index: d.day_index,
    rest_after: d.rest_after,
  }));
  const upcoming = nextRoutineDay(scheduleDays, data.lastFinishedSession?.routine_day_id ?? null);

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Your split"
        title="Lift"
        action={
          <Link
            href="/lift/edit"
            className={cn(buttonVariants({ variant: "soft", size: "sm" }))}
          >
            <Pencil className="size-3.5" aria-hidden />
            Edit
          </Link>
        }
      />

      {data.openSession ? (
        <Link
          href={`/lift/session/${data.openSession.id}`}
          className="mb-4 block cursor-pointer border border-[var(--accent)] p-5 text-ink"
        >
          <p className="eyebrow" style={{ color: "var(--accent)" }}>
            In progress
          </p>
          <p className="font-display mt-1 text-[24px] leading-tight text-ink">
            {data.openSession.title}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[15px] text-ink-soft">
            Continue <ChevronRight className="size-4" aria-hidden />
          </p>
        </Link>
      ) : null}

      {routine.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Dumbbell}
            title="No split yet"
            body="Set up your training days and the app starts prescribing targets from your first logged session."
            action={
              <Link
                href="/lift/edit"
                className={cn(buttonVariants({ variant: "glitter", size: "md" }), "mt-2")}
              >
                Build my split
              </Link>
            }
          />
        </div>
      ) : (
        <ol className="space-y-3">
          {routine.map((day) => {
            const isNext = day.id === upcoming?.id;
            const accent = ACCENT[day.accent] ?? ACCENT.pink;

            return (
              <li key={day.id}>
                <Link
                  href={`/lift/${day.id}`}
                  className={cn(
                    "card flex cursor-pointer items-center gap-4 p-4 transition-colors duration-200",
                    isNext && "border-[var(--ring)] shadow-[var(--shadow-lift)]",
                  )}
                >
                  <span
                    className="tnum font-display flex size-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
                    style={{ background: accent }}
                    aria-hidden
                  >
                    {day.day_index}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-display truncate text-base font-semibold text-ink">
                        {day.name}
                      </span>
                      {isNext ? (
                        <span className="eyebrow shrink-0" style={{ color: "var(--accent)" }}>
                          Next
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-ink-soft">
                      {day.subtitle ? `${day.subtitle} · ` : ""}
                      {day.routine_exercises.length}{" "}
                      {day.routine_exercises.length === 1 ? "exercise" : "exercises"}
                    </span>
                  </span>

                  <ChevronRight className="size-5 shrink-0 text-ink-faint" aria-hidden />
                </Link>

                {day.rest_after ? (
                  <p className="mt-2 flex items-center gap-1.5 pl-4 text-xs font-semibold text-ink-faint">
                    <Bed className="size-3.5" aria-hidden />
                    Rest day after this
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </Screen>
  );
}
