import type { Metadata } from "next";
import { getRoutine, getSessionContext, getTodayData } from "@/lib/data";
import { addDaysISO } from "@/lib/domain/dates";
import { energyBalance, macroLines, sumMeals } from "@/lib/domain/macros";
import { averageCycleLength, cycleDayFor, derivePeriodStarts, phaseFor } from "@/lib/domain/cycle";
import { isRestDay, nextRoutineDay } from "@/lib/domain/schedule";
import { Screen } from "@/components/screen";
import { HabitGrid } from "@/components/today/habit-grid";
import { EnergyCard } from "@/components/today/energy-card";
import { NextWorkoutCard, StepsCard } from "@/components/today/movement-card";
import { CycleChip } from "@/components/today/cycle-chip";
import { PagesRead } from "@/components/today/pages-read";

export const metadata: Metadata = { title: "Today" };
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const ctx = await getSessionContext();
  const [data, routine] = await Promise.all([
    getTodayData(ctx.today, addDaysISO(ctx.today, -90)),
    getRoutine(),
  ]);

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
  const cycleDay = cycleDayFor(ctx.today, periodStarts);
  const phase = phaseFor(cycleDay, averageCycleLength(periodStarts));

  const scheduleDays = routine.map((d) => ({
    id: d.id,
    day_index: d.day_index,
    rest_after: d.rest_after,
  }));
  const lastRoutineDayId = data.lastFinishedSession?.routine_day_id ?? null;
  const upcoming = nextRoutineDay(scheduleDays, lastRoutineDayId);
  const upcomingFull = routine.find((d) => d.id === upcoming?.id) ?? null;
  const restToday = isRestDay(
    scheduleDays,
    lastRoutineDayId,
    data.lastFinishedSession?.session_date ?? null,
    ctx.today,
  );

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
          <p className="text-xs font-semibold tracking-[0.14em] text-ink-faint uppercase">
            {formatToday(ctx.today, ctx.profile.timezone)}
          </p>
          <h1 className="font-display mt-1 text-[27px] leading-tight font-semibold text-ink">
            {greeting()}, <span className="glitter-text">{firstName}</span>
          </h1>
        </div>
        <div className="pt-1">
          <CycleChip
            phase={phase}
            cycleDay={cycleDay}
            today={ctx.today}
            currentFlow={data.cycle?.flow ?? "none"}
            currentSymptoms={data.cycle?.symptoms ?? []}
          />
        </div>
      </header>

      <div className="space-y-4">
        <NextWorkoutCard
          day={upcomingFull}
          openSessionId={data.openSession?.id ?? null}
          restToday={restToday}
          exerciseCount={upcomingFull?.routine_exercises.length ?? 0}
        />

        <EnergyCard
          balance={balance}
          macros={macros}
          calorieTarget={ctx.goals.calorie_target}
        />

        <StepsCard
          steps={data.health?.steps ?? null}
          target={ctx.goals.step_target}
          sleepMinutes={data.health?.sleep_minutes ?? null}
          activeKcal={data.health?.active_kcal ?? null}
        />

        <PagesRead
          today={ctx.today}
          initialPages={data.health?.pages_read ?? 0}
          target={ctx.goals.pages_target}
        />

        <section aria-labelledby="habits-heading" className="pt-2">
          <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
            <h2 id="habits-heading" className="font-display text-lg font-semibold text-ink">
              Daily habits
            </h2>
            <span className="tnum text-sm font-bold text-ink-soft">
              {habitsDone}/{data.habits.length}
            </span>
          </div>
          <HabitGrid
            habits={data.habits}
            counts={data.habitCounts}
            history={history}
            today={ctx.today}
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
