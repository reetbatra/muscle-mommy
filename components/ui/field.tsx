"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-semibold text-ink-soft", className)}
      {...props}
    />
  );
}

const fieldBase =
  "w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink " +
  "placeholder:text-ink-faint transition-colors duration-200 " +
  "focus:border-[var(--ring)] focus:outline-none disabled:opacity-60";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldBase, "h-12", className)} {...props} />;
  },
);

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "py-3 leading-relaxed", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10", className)} {...props}>
      {children}
    </select>
  );
}

export function FieldRow({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}

/**
 * Big plus and minus buttons around a number. Typing into a keypad mid-set is
 * miserable, so the primary interaction is a 44px tap.
 */
export function NumberStepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  suffix,
  label,
  className,
  size = "md",
}: {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const clampSet = (next: number) => onChange(Math.min(Math.max(round(next), min), max));
  const buttonSize = size === "sm" ? "size-9" : "size-11";

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border border-line bg-surface p-1",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => clampSet(value - step)}
        aria-label={`Decrease ${label}`}
        className={cn(
          buttonSize,
          "flex shrink-0 cursor-pointer items-center justify-center rounded-full",
          "bg-surface-2 text-ink transition-colors duration-150 hover:bg-surface-3 active:scale-95",
          "disabled:opacity-35",
        )}
        disabled={value <= min}
      >
        <Minus className="size-4" aria-hidden />
      </button>

      <input
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => clampSet(Number(e.target.value))}
        aria-label={label}
        className={cn(
          "tnum min-w-0 flex-1 bg-transparent text-center font-semibold text-ink",
          "focus:outline-none",
          size === "sm" ? "text-base" : "text-lg",
        )}
      />
      {suffix ? (
        <span className="pointer-events-none pr-1 text-xs font-medium text-ink-faint">{suffix}</span>
      ) : null}

      <button
        type="button"
        onClick={() => clampSet(value + step)}
        aria-label={`Increase ${label}`}
        className={cn(
          buttonSize,
          "flex shrink-0 cursor-pointer items-center justify-center rounded-full",
          "bg-surface-2 text-ink transition-colors duration-150 hover:bg-surface-3 active:scale-95",
          "disabled:opacity-35",
        )}
        disabled={value >= max}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
