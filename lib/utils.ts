import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** 12.0 -> "12", 12.5 -> "12.5". Weights should never render as "12.00". */
export function trimNumber(value: number, maxDecimals = 1) {
  return Number(value.toFixed(maxDecimals)).toString();
}

export function pluralise(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}
