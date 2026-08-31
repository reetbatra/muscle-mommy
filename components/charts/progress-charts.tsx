"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartFrame, ChartTooltip } from "./chart-frame";
import { useChartPalette } from "./use-chart-palette";
import type { DayPoint, SessionPoint } from "@/lib/progress";
import type { BodyComp } from "@/lib/domain/types";

const AXIS_STYLE = { fontSize: 11, fontWeight: 600 };

function shortDate(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d}/${m}`;
}

export function WeightChart({
  days,
  goalKg,
  comps,
}: {
  days: DayPoint[];
  goalKg: number | null;
  comps: BodyComp[];
}) {
  const palette = useChartPalette();

  const data = useMemo(() => {
    // Health pushes a weight most days; an InBody scan is the better reading
    // when both exist on the same day.
    const byDate = new Map(days.map((d) => [d.date, d.weightKg] as [string, number | null]));
    for (const comp of comps) {
      if (comp.weight_kg !== null && byDate.has(comp.measured_on)) {
        byDate.set(comp.measured_on, Number(comp.weight_kg));
      }
    }
    return [...byDate.entries()]
      .filter(([, weight]) => weight !== null)
      .map(([date, weight]) => ({ date, label: shortDate(date), weight: weight as number }));
  }, [days, comps]);

  if (data.length < 2) {
    return (
      <EmptyChart
        title="Weight"
        body="Two readings and this becomes a line. Apple Health can send it every morning."
      />
    );
  }

  const first = data[0].weight;
  const last = data.at(-1)!.weight;
  const change = last - first;

  return (
    <ChartFrame
      title="Weight"
      subtitle={`${last.toFixed(1)}kg now, ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)}kg over ${data.length} readings.`}
      table={{
        columns: ["Date", "Weight"],
        rows: data.map((d) => [d.date, `${d.weight.toFixed(1)}kg`]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={palette.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ ...AXIS_STYLE, fill: palette.axis }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={{ ...AXIS_STYLE, fill: palette.axis }}
            axisLine={false}
            tickLine={false}
            domain={["dataMin - 1", "dataMax + 1"]}
            width={44}
          />
          <Tooltip content={<ChartTooltip unit="kg" />} cursor={{ stroke: palette.grid }} />
          {goalKg ? (
            <ReferenceLine
              y={goalKg}
              stroke={palette.axis}
              strokeDasharray="4 4"
              label={{ value: "Goal", position: "insideTopRight", fill: palette.axis, fontSize: 10 }}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="weight"
            name="Weight"
            stroke={palette.series1}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function EnergyChart({ days }: { days: DayPoint[] }) {
  const palette = useChartPalette();

  const data = useMemo(
    () =>
      days
        .slice(-21)
        .filter((d) => d.consumed !== null || d.burned !== null)
        .map((d) => ({
          label: shortDate(d.date),
          date: d.date,
          eaten: d.consumed ?? null,
          burned: d.burned ?? null,
        })),
    [days],
  );

  if (data.length < 2) {
    return (
      <EmptyChart
        title="Calories in and out"
        body="Log a couple of days of food and this shows whether the deficit is real."
      />
    );
  }

  const deficitDays = data.filter(
    (d) => d.eaten !== null && d.burned !== null && d.eaten < d.burned,
  ).length;

  return (
    <ChartFrame
      title="Calories in and out"
      subtitle={`In a deficit on ${deficitDays} of the last ${data.length} logged days.`}
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
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={palette.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ ...AXIS_STYLE, fill: palette.axis }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ ...AXIS_STYLE, fill: palette.axis }}
            axisLine={false}
            tickLine={false}
            width={46}
          />
          <Tooltip content={<ChartTooltip unit=" kcal" />} cursor={{ stroke: palette.grid }} />
          <Line
            type="monotone"
            dataKey="eaten"
            name="Eaten"
            stroke={palette.series1}
            strokeWidth={2}
            dot={false}
            connectNulls
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }}
          />
          <Line
            type="monotone"
            dataKey="burned"
            name="Burned"
            stroke={palette.series2}
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            connectNulls
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function StepsChart({ days, target }: { days: DayPoint[]; target: number }) {
  const palette = useChartPalette();

  const data = useMemo(
    () =>
      days
        .slice(-14)
        .map((d) => ({ label: shortDate(d.date), date: d.date, steps: d.steps ?? 0 })),
    [days],
  );

  const logged = data.filter((d) => d.steps > 0);
  if (logged.length === 0) {
    return (
      <EmptyChart
        title="Steps"
        body="Set up the Apple Shortcut and two weeks of steps appear here without you doing anything."
      />
    );
  }

  const hitTarget = logged.filter((d) => d.steps >= target).length;

  return (
    <ChartFrame
      title="Steps"
      subtitle={`Hit ${target.toLocaleString()} on ${hitTarget} of the last ${logged.length} tracked days.`}
      table={{
        columns: ["Date", "Steps"],
        rows: data.map((d) => [d.date, d.steps ? d.steps.toLocaleString() : "—"]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid stroke={palette.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ ...AXIS_STYLE, fill: palette.axis }}
            axisLine={false}
            tickLine={false}
            minTickGap={14}
          />
          <YAxis
            tick={{ ...AXIS_STYLE, fill: palette.axis }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: palette.grid, fillOpacity: 0.4 }} />
          <ReferenceLine y={target} stroke={palette.axis} strokeDasharray="4 4" />
          <Bar
            dataKey="steps"
            name="Steps"
            fill={palette.series2}
            radius={[4, 4, 0, 0]}
            stroke="var(--surface)"
            strokeWidth={2}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function OverloadChart({ sessions }: { sessions: SessionPoint[] }) {
  const palette = useChartPalette();

  if (sessions.length < 2) {
    return (
      <EmptyChart
        title="Overload rate"
        body="After two logged sessions of the same day, this shows what share of exercises beat the time before."
      />
    );
  }

  const average = Math.round(sessions.reduce((n, s) => n + s.pct, 0) / sessions.length);
  const data = sessions.map((s) => ({
    label: `${shortDate(s.date)}`,
    title: s.title,
    pct: s.pct,
    detail: `${s.up}/${s.scored}`,
  }));

  return (
    <ChartFrame
      title="Overload rate"
      subtitle={`${average}% of exercises beat the previous session, averaged over your last ${sessions.length}.`}
      table={{
        columns: ["Date", "Session", "Beat last time", "Rate"],
        rows: sessions.map((s) => [s.date, s.title, `${s.up} of ${s.scored}`, `${s.pct}%`]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={palette.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ ...AXIS_STYLE, fill: palette.axis }}
            axisLine={false}
            tickLine={false}
            minTickGap={10}
          />
          <YAxis
            tick={{ ...AXIS_STYLE, fill: palette.axis }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            width={38}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: palette.grid, fillOpacity: 0.4 }} />
          <ReferenceLine y={average} stroke={palette.axis} strokeDasharray="4 4" />
          <Bar
            dataKey="pct"
            name="Beat last time"
            fill={palette.series1}
            radius={[4, 4, 0, 0]}
            stroke="var(--surface)"
            strokeWidth={2}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function BodyCompChart({ comps }: { comps: BodyComp[] }) {
  const palette = useChartPalette();

  const data = useMemo(
    () =>
      comps
        .filter((c) => c.skeletal_muscle_kg !== null || c.body_fat_kg !== null)
        .map((c) => ({
          label: shortDate(c.measured_on),
          date: c.measured_on,
          muscle: c.skeletal_muscle_kg !== null ? Number(c.skeletal_muscle_kg) : 0,
          fat: c.body_fat_kg !== null ? Number(c.body_fat_kg) : 0,
        })),
    [comps],
  );

  if (data.length === 0) {
    return (
      <EmptyChart
        title="Body composition"
        body="Add an InBody scan and this tracks muscle against fat, which is the number that actually matters in a deficit."
      />
    );
  }

  const latest = data.at(-1)!;
  const first = data[0];
  const muscleChange = latest.muscle - first.muscle;

  return (
    <ChartFrame
      title="Body composition"
      subtitle={
        data.length > 1
          ? `Muscle ${muscleChange >= 0 ? "up" : "down"} ${Math.abs(muscleChange).toFixed(1)}kg since your first scan.`
          : `${latest.muscle.toFixed(1)}kg muscle, ${latest.fat.toFixed(1)}kg fat.`
      }
      legend={[
        { label: "Skeletal muscle", color: palette.series1 },
        { label: "Body fat", color: palette.series2 },
      ]}
      table={{
        columns: ["Date", "Muscle", "Fat"],
        rows: data.map((d) => [d.date, `${d.muscle.toFixed(1)}kg`, `${d.fat.toFixed(1)}kg`]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }} barGap={2}>
          <CartesianGrid stroke={palette.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ ...AXIS_STYLE, fill: palette.axis }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ ...AXIS_STYLE, fill: palette.axis }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <Tooltip content={<ChartTooltip unit="kg" />} cursor={{ fill: palette.grid, fillOpacity: 0.4 }} />
          <Bar dataKey="muscle" name="Skeletal muscle" fill={palette.series1} radius={[4, 4, 0, 0]} />
          <Bar dataKey="fat" name="Body fat" fill={palette.series2} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function EmptyChart({ title, body }: { title: string; body: string }) {
  return (
    <section className="card p-5">
      <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p>
    </section>
  );
}
