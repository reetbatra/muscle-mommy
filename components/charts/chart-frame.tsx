"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Every chart ships with a table of the same numbers. Colour and shape are
 * never the only way to read a value here.
 */
export function ChartFrame({
  title,
  subtitle,
  legend,
  table,
  height = 180,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  legend?: { label: string; color: string }[];
  table: { columns: string[]; rows: (string | number)[][] };
  height?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  return (
    <section className={cn("card p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base leading-tight font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p> : null}
        </div>
      </div>

      {legend && legend.length > 1 ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {legend.map((entry) => (
            <li key={entry.label} className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: entry.color }}
                aria-hidden
              />
              {entry.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4" style={{ height }} aria-hidden>
        {children}
      </div>

      <button
        type="button"
        onClick={() => setShowTable((v) => !v)}
        aria-expanded={showTable}
        aria-controls={tableId}
        className="mt-2 flex min-h-9 cursor-pointer items-center gap-1 text-xs font-bold text-ink-faint transition-colors duration-150 hover:text-ink"
      >
        <ChevronDown
          className={cn("size-3.5 transition-transform duration-200", showTable && "rotate-180")}
          aria-hidden
        />
        {showTable ? "Hide the numbers" : "See the numbers"}
      </button>

      <div id={tableId} hidden={!showTable} className="mt-2 max-h-64 overflow-auto rounded-[2px] border border-line">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">{title}</caption>
          <thead className="sticky top-0 bg-surface-2">
            <tr>
              {table.columns.map((column) => (
                <th key={column} scope="col" className="px-3 py-2 font-bold text-ink-soft">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, index) => (
              <tr key={index} className="border-t border-line">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="tnum px-3 py-1.5 text-ink">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[2px] border border-line bg-surface px-3 py-2 shadow-[var(--shadow-lift)]">
      <p className="text-[11px] font-bold text-ink-faint">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="tnum mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-ink">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: entry.color }}
            aria-hidden
          />
          {entry.name ? <span className="text-ink-soft">{entry.name}</span> : null}
          {entry.value}
          {unit ? <span className="text-ink-faint">{unit}</span> : null}
        </p>
      ))}
    </div>
  );
}
