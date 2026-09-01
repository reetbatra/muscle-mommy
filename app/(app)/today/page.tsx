import type { Metadata } from "next";
import { getRoutine, getSessionContext, getTodayData, getWeekDays } from "@/lib/data";
import { addDaysISO, resolveViewedDate } from "@/lib/domain/dates";
import { energyBalance, macroLines, sumMeals } from "@/lib/domain/macros";
import { prettyDate } from "@/lib/domain/dates";
import { weeklyBalance } from "@/lib/domain/week";
import { averageCycleLength, cycleDayFor, derivePeriodStarts, phaseFor } from "@/lib/domain/cycle";
import { todayState } from "@/lib/domain/schedule";
import { Screen } from "@/components/screen";
import { HabitGrid } from "@/components/today/habit-grid";
import { EnergyCard } from "@/components/today/energy-card";
import { MovementCard } from "@/components/today/movement-card";
import { NextWorkoutCard } from "@/components/today/next-workout-card";
import { CycleChip } from "@/components/today/cycle-chip";
import { PagesRead } from "@/components/today/pages-read";
import { WeekCard } from "@/components/today/week-card";
import { Sparkle } from "@/components/ui/sparkle";
import { DateNav } from "@/components/date-nav";

export const metadata: Metadata = { title: "Today" };
export const dynamic = "force-dynamic";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const ctx = await getSessionContext();
  const { d } = await searchParams;
  // Any day inside the editable window, defaulting to today.
  const viewed = resolveViewedDate(d, ctx.today);
  const isToday = viewed === ctx.today;
  const [data, routine, weekDays] = await Promise.all([
    getTodayData(viewed, addDaysISO(viewed, -90)),
    getRoutine(),
    getWeekDays(viewed),
  ]);

  const week = weeklyBalance({
    today: viewed,
    days: weekDays,
    calorieTarget: ctx.goals.calorie_target,
    maintenanceKcal: ctx.goals.maintenance_kcal,
  });

  const totals = sumMeals(data.meals);
  const balance = energyBalance({
    consumed: totals.kcal,
    maintenanceKcal: ctx.goals.maintenance_kcal,
    activeKcal: data.health?.active_kcal ?? 0,
    basalKcal: data.health?.basal_kcal ?? null,
    calorieTarget: ctx.goals.calorie_target,
  });

  const macros = macroLines(totals, {
    kcal: ctx.goals.calorie_target,
    protein_g: ctx.goals.protein_g,
    carbs_g: ctx.goals.carbs_g,
    fat_g: ctx.goals.fat_g,
    fiber_g: ctx.goals.fiber_g,
  });

  const periodStarts = derivePeriodStarts(data.periodFlow);
  const cycleDay = cycleDayFor(viewed, periodStarts);
  const phase = phaseFor(cycleDay, averageCycleLength(periodStarts));

  const scheduleDays = routine.map((d) => ({
    id: d.id,
    day_index: d.day_index,
    rest_after: d.rest_after,
  }));
  const state = todayState(
    scheduleDays,
    {
      routineDayId: data.lastFinishedSession?.routine_day_id ?? null,
      dateISO: data.lastFinishedSession?.session_date ?? null,
    },
    ctx.today,
  );
  const upcomingFull =
    state.kind === "next" ? (routine.find((d) => d.id === state.day?.id) ?? null) : null;

  const history = Object.fromEntries(
    Object.entries(data.habitHistory).map(([id, dates]) => [id, [...dates]]),
  );
  const habitsDone = data.habits.filter(
    (h) => (data.habitCounts[h.id] ?? 0) >= h.target_per_day,
  ).length;

  const firstName = ctx.profile.display_name?.split(" ")[0] ?? "you";

  return (
    <Screen>
      <header className="flex items-start justify-between gap-3 pt-6 pb-5">
        <div className="min-w-0">
          <p className="eyebrow">{formatToday(viewed, ctx.profile.timezone)}</p>
          {isToday ? (
            <>
              <h1 className="font-display mt-2 text-[38px] leading-[1.05] text-ink">
                {greeting()},
              </h1>
              <p className="hand mt-1.5 flex items-center gap-2.5 text-[32px] leading-none">
                {firstName}
                <Sparkle size={14} twinkle />
              </p>
            </>
          ) : (
            <h1 className="font-display mt-2 text-[34px] leading-[1.05] text-ink">
              {prettyDate(viewed, ctx.today)}
            </h1>
          )}
        </div>
        <div className="pt-1">
          <CycleChip
            phase={phase}
            cycleDay={cycleDay}
            today={viewed}
            currentFlow={data.cycle?.flow ?? "none"}
            currentSymptoms={data.cycle?.symptoms ?? []}
          />
        </div>
      </header>

      <DateNav date={viewed} today={ctx.today} className="-ml-2.5 pb-4" />

      <div className="space-y-4">
        {isToday ? (
          <NextWorkoutCard
          day={upcomingFull}
          openSessionId={data.openSession?.id ?? null}
          state={state.kind}
            exerciseCount={upcomingFull?.routine_exercises.length ?? 0}
          />
        ) : null}

        <WeekCard balance={week} />

        <EnergyCard
          balance={balance}
          macros={macros}
          calorieTarget={ctx.goals.calorie_target}
        />

        <MovementCard
          date={viewed}
          steps={data.health?.steps ?? null}
          target={ctx.goals.step_target}
          sleepMinutes={data.health?.sleep_minutes ?? null}
          activeKcal={data.health?.active_kcal ?? null}
          basalKcal={data.health?.basal_kcal ?? null}
          exerciseMinutes={data.health?.exercise_minutes ?? null}
          lastRestingKcal={data.lastRestingKcal}
          maintenanceKcal={ctx.goals.maintenance_kcal}
          consumedKcal={totals.kcal}
        />

        <PagesRead
          today={viewed}
          initialPages={data.health?.pages_read ?? 0}
          target={ctx.goals.pages_target}
        />

        <section aria-labelledby="habits-heading" className="pt-2">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 id="habits-heading" className="eyebrow">
              Habits
            </h2>
            <span className="tnum flex items-center gap-1.5 text-[13px] text-ink-faint">
              {habitsDone > 0 && habitsDone === data.habits.length ? (
                <Sparkle size={12} twinkle />
              ) : null}
              {habitsDone}/{data.habits.length}
            </span>
          </div>
          <HabitGrid
            habits={data.habits}
            counts={data.habitCounts}
            history={history}
            today={viewed}
          />
        </section>
      </div>
    </Screen>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

function formatToday(iso: string, timezone: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
