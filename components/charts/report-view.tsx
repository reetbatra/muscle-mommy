"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame, ChartTooltip } from "./chart-frame";
import { useChartPalette } from "./use-chart-palette";
import { Segmented } from "@/components/ui/segmented";
import { Sparkle } from "@/components/ui/sparkle";
import type { Report, ReportPeriod } from "@/lib/report";

const AXIS = { fontSize: 11, fontWeight: 600 };

export function ReportView({
  week,
  month,
}: {
  week: Report;
  month: Report;
}) {
  const [period, setPeriod] = useState<ReportPeriod>("week");
  const report = period === "week" ? week : month;

  return (
    <div className="space-y-4">
      <Segmented
        value={period}
        onChange={setPeriod}
        label="Report period"
        options={[
          { value: "week", label: "7 days" },
          { value: "month", label: "30 days" },
        ]}
      />

      <Headline report={report} />
      <EnergyBars report={report} />
      <MacroSplit report={report} />
      <VolumeBars report={report} />
      <HabitBars report={report} />
    </div>
  );
}

function Headline({ report }: { report: Report }) {
  const stats: { label: string; value: string; note?: string; good?: boolean }[] = [
    {
      label: "Sessions",
      value: String(report.sessions),
    },
    {
      label: "Lifts up",
      value: report.liftsScored > 0 ? `${report.overloadPct}%` : "—",
      note: report.liftsScored > 0 ? `${report.liftsUp} of ${report.liftsScored}` : "no comparison yet",
      good: report.overloadPct >= 50,
    },
    {
      label: "Days under",
      value: report.loggedFoodDays > 0 ? `${report.deficitDays}` : "—",
      note: report.loggedFoodDays > 0 ? `of ${report.loggedFoodDays} logged` : "nothing logged",
      good: report.deficitDays > 0,
    },
    {
      label: "Weight",
      value: report.weightChange
        ? `${report.weightChange.delta >= 0 ? "+" : ""}${report.weightChange.delta.toFixed(1)}kg`
        : "—",
      note: report.weightChange ? `now ${report.weightChange.to.toFixed(1)}kg` : "no readings",
    },
  ];

  return (
    <section className="card">
      <p className="eyebrow">Headline</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-5">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="eyebrow">{stat.label}</dt>
            <dd className="tnum font-display mt-1 flex items-baseline gap-1.5 text-[30px] leading-none text-ink">
              {stat.value}
              {stat.good ? <Sparkle size={12} twinkle /> : null}
            </dd>
            {stat.note ? <p className="tnum mt-1 text-[13px] text-ink-faint">{stat.note}</p> : null}
          </div>
        ))}
      </dl>
    </section>
  );
}

function EnergyBars({ report }: { report: Report }) {
  const palette = useChartPalette();
  const data = report.days.filter((d) => d.eaten !== null || d.burned !== null);

  if (data.length < 2) {
    return <Empty title="Calories" body="Log a couple of days of food and this fills in." />;
  }

  return (
    <ChartFrame
      title="Calories in and out"
      subtitle={`Under on ${report.deficitDays} of ${report.loggedFoodDays} logged days.`}
      legend={[
        { label: "Eaten", color: palette.series1 },
        { label: "Burned", color: palette.series2 },
      ]}
      table={{
        columns: ["Date", "Eaten", "Burned"],
        rows: data.map((d) => [d.date, d.eaten ?? "—", d.burned ?? "—"]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -12 }} barGap={2}>
          <CartesianGrid stroke={palette.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tick={{ ...AXIS, fill: palette.axis }} axisLine={false} tickLine={false} minTickGap={12} />
          <YAxis tick={{ ...AXIS, fill: palette.axis }} axisLine={false} tickLine={false} width={44} />
          <Tooltip content={<ChartTooltip unit=" kcal" />} cursor={{ fill: palette.grid, fillOpacity: 0.4 }} />
          <Bar dataKey="eaten" name="Eaten" fill={palette.series1} radius={[2, 2, 0, 0]} />
          <Bar dataKey="burned" name="Burned" fill={palette.series2} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/**
 * A stacked bar rather than a pie. Three slices of a circle are hard to compare
 * and impossible to label well on a phone; one bar with the numbers written on
 * it answers the question directly.
 */
function MacroSplit({ report }: { report: Report }) {
  const palette = useChartPalette();
  const { protein_g, carbs_g, fat_g } = report.macroAverage;

  const parts = [
    { label: "Protein", grams: protein_g, kcal: protein_g * 4, color: palette.series1 },
    { label: "Carbs", grams: carbs_g, kcal: carbs_g * 4, color: palette.series2 },
    { label: "Fat", grams: fat_g, kcal: fat_g * 9, color: palette.series3 },
  ];
  const total = parts.reduce((n, p) => n + p.kcal, 0);

  if (total <= 0) {
    return <Empty title="Where the calories came from" body="Log some food and this fills in." />;
  }

  return (
    <ChartFrame
      title="Where the calories came from"
      subtitle={`Average day: ${Math.round(report.macroAverage.kcal)} kcal, ${Math.round(protein_g)}g protein.`}
      legend={parts.map((p) => ({ label: p.label, color: p.color }))}
      height={64}
      table={{
        columns: ["Macro", "Grams a day", "Share of calories"],
        rows: parts.map((p) => [
          p.label,
          Math.round(p.grams),
          `${Math.round((p.kcal / total) * 100)}%`,
        ]),
      }}
    >
      <div>
        <div className="flex h-6 w-full gap-[2px] overflow-hidden">
          {parts.map((part) => (
            <div
              key={part.label}
              style={{ width: `${(part.kcal / total) * 100}%`, background: part.color }}
              title={`${part.label}: ${Math.round((part.kcal / total) * 100)}%`}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between">
          {parts.map((part) => (
            <span key={part.label} className="tnum text-[13px] text-ink-soft">
              {Math.round((part.kcal / total) * 100)}%{" "}
              <span className="text-ink-faint">{Math.round(part.grams)}g</span>
            </span>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}

function VolumeBars({ report }: { report: Report }) {
  const palette = useChartPalette();
  if (report.volumeByMuscle.length === 0) {
    return <Empty title="Volume by muscle" body="Finish a session and this fills in." />;
  }

  const data = report.volumeByMuscle.slice(0, 8);
  return (
    <ChartFrame
      title="Volume by muscle"
      subtitle={`Total kilos moved across ${report.sessions} ${report.sessions === 1 ? "session" : "sessions"}.`}
      height={Math.max(150, data.length * 30)}
      table={{
        columns: ["Muscle", "Volume"],
        rows: data.map((d) => [d.muscle, `${d.volume.toLocaleString()} kg`]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 2, right: 12, bottom: 2, left: 0 }}>
          <CartesianGrid stroke={palette.grid} strokeDasharray="2 4" horizontal={false} />
          <XAxis type="number" tick={{ ...AXIS, fill: palette.axis }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="muscle" width={92} tick={{ ...AXIS, fill: palette.axis }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip unit=" kg" />} cursor={{ fill: palette.grid, fillOpacity: 0.4 }} />
          <Bar dataKey="volume" name="Volume" fill={palette.series1} radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function HabitBars({ report }: { report: Report }) {
  const palette = useChartPalette();
  if (report.habits.length === 0) return null;

  const data = [...report.habits].sort((a, b) => b.pct - a.pct);
  const cleared = data.filter((h) => h.pct >= 80).length;

  return (
    <ChartFrame
      title="Habits"
      subtitle={`${cleared} of ${data.length} held at 80% or better.`}
      height={Math.max(170, data.length * 28)}
      table={{
        columns: ["Habit", "Days", "Rate"],
        rows: data.map((h) => [h.label, `${h.done} / ${h.possible}`, `${h.pct}%`]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 2, right: 12, bottom: 2, left: 0 }}>
          <CartesianGrid stroke={palette.grid} strokeDasharray="2 4" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ ...AXIS, fill: palette.axis }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={112} tick={{ ...AXIS, fill: palette.axis }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: palette.grid, fillOpacity: 0.4 }} />
          <Bar dataKey="pct" name="Held" fill={palette.series2} radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <section className="card">
      <h2 className="font-display text-[19px] text-ink">{title}</h2>
      <p className="mt-1 text-[15px] text-ink-soft">{body}</p>
    </section>
  );
}
