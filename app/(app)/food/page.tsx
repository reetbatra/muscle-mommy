import type { Metadata } from "next";
import { getSessionContext, getTodayData, getWeekDays } from "@/lib/data";
import { signMealPhotos } from "@/lib/actions/food";
import { addDaysISO, prettyDate, resolveViewedDate } from "@/lib/domain/dates";
import { energyBalance, macroLines, sumMeals } from "@/lib/domain/macros";
import { weeklyBalance } from "@/lib/domain/week";
import { Screen, ScreenHeader } from "@/components/screen";
import { EnergyCard } from "@/components/today/energy-card";
import { MealLogger } from "@/components/food/meal-logger";
import { WeekCard } from "@/components/today/week-card";
import { DateNav } from "@/components/date-nav";

export const metadata: Metadata = { title: "Food" };
export const dynamic = "force-dynamic";

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const ctx = await getSessionContext();
  const { d } = await searchParams;
  const viewed = resolveViewedDate(d, ctx.today);
  const [data, weekDays] = await Promise.all([
    getTodayData(viewed, addDaysISO(viewed, -1)),
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

  const paths = data.meals.map((m) => m.photo_path).filter((p): p is string => Boolean(p));
  const photoUrls = await signMealPhotos(paths);

  return (
    <Screen>
      <ScreenHeader
        eyebrow={
          week.loggedDays === 0
            ? "Nothing logged yet"
            : `${Math.round(week.perDayRemaining)} kcal a day to stay on the week`
        }
        title={viewed === ctx.today ? "Food" : prettyDate(viewed, ctx.today)}
      />

      <DateNav date={viewed} today={ctx.today} className="-ml-2.5 pb-4" />

      <div className="space-y-4">
        <WeekCard balance={week} />
        <EnergyCard
          balance={balance}
          macros={macros}
          calorieTarget={ctx.goals.calorie_target}
          burnHref={viewed === ctx.today ? "/today" : `/today?d=${viewed}`}
        />
        <MealLogger meals={data.meals} photoUrls={photoUrls} today={viewed} />
      </div>
    </Screen>
  );
}
