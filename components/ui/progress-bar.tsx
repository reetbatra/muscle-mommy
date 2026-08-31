import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max,
  color = "var(--pink-deep)",
  label,
  className,
  height = 8,
}: {
  value: number;
  max: number;
  color?: string;
  label: string;
  className?: string;
  height?: number;
}) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(Math.max((value / safeMax) * 100, 0), 100);
  const over = value / safeMax > 1.02;

  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-surface-3", className)}
      style={{ height }}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(safeMax)}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%`, background: over ? "var(--coral)" : color }}
      />
    </div>
  );
}
