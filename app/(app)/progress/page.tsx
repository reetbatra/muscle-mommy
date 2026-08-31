import type { Metadata } from "next";
import { getSessionContext } from "@/lib/data";
import { getProgressData } from "@/lib/progress";
import { getReport } from "@/lib/report";
import { Screen, ScreenHeader } from "@/components/screen";
import {
  BodyCompChart,
  EnergyChart,
  OverloadChart,
  StepsChart,
  WeightChart,
} from "@/components/charts/progress-charts";
import { StrengthList } from "@/components/charts/strength-list";
import { BodyCompSheet } from "@/components/charts/body-comp-sheet";
import { ReportView } from "@/components/charts/report-view";

export const metadata: Metadata = { title: "Progress" };
export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const ctx = await getSessionContext();
  const [data, week, month] = await Promise.all([
    getProgressData(ctx.today, ctx.goals.maintenance_kcal),
    getReport("week", ctx.today, ctx.goals.maintenance_kcal),
    getReport("month", ctx.today, ctx.goals.maintenance_kcal),
  ]);

  const habitDays = data.habitRate.filter((d) => d.ratio > 0).length;
  const habitAverage =
    data.habitRate.length > 0
      ? Math.round(
          (data.habitRate.reduce((n, d) => n + d.ratio, 0) / data.habitRate.length) * 100,
        )
      : 0;

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Report"
        title="Progress"
        action={<BodyCompSheet today={ctx.today} latest={data.bodyComps.at(-1) ?? null} />}
      />

      <ReportView week={week} month={month} />

      <div className="mt-10 space-y-4">
        <p className="eyebrow">Longer view</p>
        <OverloadChart sessions={data.sessions} />
        <StrengthList exercises={data.exercises} />
        <WeightChart
          days={data.days}
          goalKg={ctx.goals.weight_goal_kg ? Number(ctx.goals.weight_goal_kg) : null}
          comps={data.bodyComps}
        />
        <BodyCompChart comps={data.bodyComps} />
        <EnergyChart days={data.days} />
        <StepsChart days={data.days} target={ctx.goals.step_target} />

        <section className="card p-5">
          <h2 className="font-display text-base font-semibold text-ink">Habits</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            {habitDays === 0
              ? "Nothing ticked off in the last month yet."
              : `You cleared an average of ${habitAverage}% of your daily habits over the last 30 days, on ${habitDays} of them.`}
          </p>
        </section>
      </div>
    </Screen>
  );
}
