"use client";

import { cn } from "@/lib/utils";

/**
 * A single macro or calorie ring. The value is announced to screen readers as
 * a percentage, because the ring itself carries no text for small sizes.
 */
export function ProgressRing({
  value,
  max,
  size = 96,
  thickness = 9,
  color = "var(--accent)",
  trackColor = "var(--surface-3)",
  label,
  children,
  className,
  overflowColor = "var(--bad)",
}: {
  value: number;
  max: number;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  overflowColor?: string;
  label: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const safeMax = max > 0 ? max : 1;
  const ratio = value / safeMax;
  const shown = Math.min(Math.max(ratio, 0), 1);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - shown);
  const isOver = ratio > 1.02;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      role="img"
      aria-label={`${label}: ${Math.round(ratio * 100)} percent of target`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isOver ? overflowColor : color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1), stroke 300ms" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
