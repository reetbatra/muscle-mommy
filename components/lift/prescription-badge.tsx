import { ArrowUp, Check, Minus, TrendingUp } from "lucide-react";
import { Sparkle } from "@/components/ui/sparkle";
import type { PrescriptionStatus } from "@/lib/domain/overload";
import { cn } from "@/lib/utils";

const STATUS = {
  "add-weight": {
    icon: ArrowUp,
    label: "Weight up",
    className: "bg-[var(--good)] text-white",
  },
  "extend-reps": {
    icon: TrendingUp,
    label: "Reps up",
    className: "bg-[var(--accent-soft)] text-white",
  },
  "add-reps": {
    icon: Check,
    label: "Beat it",
    className: "bg-surface-3 text-[var(--accent)]",
  },
  first: {
    icon: TrendingUp,
    label: "First time",
    className: "bg-surface-3 text-ink-soft",
  },
} as const satisfies Record<PrescriptionStatus, unknown>;

export function PrescriptionBadge({
  status,
  className,
}: {
  status: PrescriptionStatus;
  className?: string;
}) {
  const config = STATUS[status];
  const Icon = config.icon;
  const earned = status === "add-weight" || status === "extend-reps";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
        config.className,
        className,
      )}
    >
      {earned ? <Sparkle size={11} twinkle /> : <Icon className="size-3" aria-hidden />}
      {config.label}
    </span>
  );
}

export function VerdictPill({
  verdict,
  reason,
}: {
  verdict: "up" | "same" | "down" | "first";
  reason: string;
}) {
  const style = {
    up: { icon: ArrowUp, color: "var(--good)" },
    same: { icon: Minus, color: "var(--warn)" },
    down: { icon: Minus, color: "var(--bad)" },
    first: { icon: TrendingUp, color: "var(--ink-faint)" },
  }[verdict];
  const Icon = style.icon;

  return (
    <span className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: style.color }}>
      {verdict === "up" ? <Sparkle size={12} twinkle /> : <Icon className="size-3.5 shrink-0" aria-hidden />}
      {reason}
    </span>
  );
}
