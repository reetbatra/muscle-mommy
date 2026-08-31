"use client";

import { useEffect, useState } from "react";

/**
 * Recharts writes colours as SVG presentation attributes, and those do not
 * resolve `var()`. So the tokens are read off the document once on mount,
 * which keeps globals.css the single source of truth without hardcoding hexes
 * in two places. The app is light only, so there is nothing to watch for.
 */
export type ChartPalette = {
  series1: string;
  series2: string;
  grid: string;
  axis: string;
};

const FALLBACK: ChartPalette = {
  series1: "#db2777",
  series2: "#2a78d6",
  grid: "#f3dcea",
  axis: "#9b7d99",
};

export function useChartPalette(): ChartPalette {
  const [palette, setPalette] = useState<ChartPalette>(FALLBACK);

  useEffect(() => {
    const read = () => {
      const styles = getComputedStyle(document.documentElement);
      const get = (name: string, fallback: string) =>
        styles.getPropertyValue(name).trim() || fallback;
      setPalette({
        series1: get("--chart-1", FALLBACK.series1),
        series2: get("--chart-2", FALLBACK.series2),
        grid: get("--chart-grid", FALLBACK.grid),
        axis: get("--chart-axis", FALLBACK.axis),
      });
    };

    read();
  }, []);

  return palette;
}
