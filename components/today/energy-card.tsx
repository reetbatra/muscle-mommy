import Link from "next/link";
import { Flame, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Sparkle } from "@/components/ui/sparkle";
import { ProgressRing } from "@/components/ui/progress-ring";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { EnergyBalance, MacroLine } from "@/lib/domain/macros";
import { cn } from "@/lib/utils";

const VERDICT_STYLE = {
  deficit: { icon: TrendingDown, color: "var(--good)", chip: "On track" },
  maintenance: { icon: Minus, color: "var(--warn)", chip: "Level" },
  surplus: { icon: TrendingUp, color: "var(--bad)", chip: "Over" },
  pending: { icon: Flame, color: "var(--ink-faint)", chip: "Waiting" },
} as const;

export function EnergyCard({
  balance,
  macros,
  calorieTarget,
  burnHref,
}: {
  balance: EnergyBalance;
  macros: MacroLine[];
  calorieTarget: number;
  /** Where to go to fix the burn figure, when it is not on this screen. */
  burnHref?: string;
}) {
  const style = VERDICT_STYLE[balance.verdict];
  const Icon = style.icon;

  return (
    <section className="card p-5" aria-labelledby="energy-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="energy-heading" className="font-display text-lg font-semibold text-ink">
          Today&rsquo;s food
        </h2>
        <span
          className="flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold"
          style={{ color: style.color }}
        >
          <Icon className="size-3.5" aria-hidden />
          {style.chip}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <ProgressRing
          value={balance.consumed}
          max={calorieTarget}
          size={104}
          thickness={10}
          label="Calories against target"
          color="var(--accent)"
        >
          <span className="tnum font-display text-2xl leading-none font-bold text-ink">
            {Math.round(balance.consumed)}
          </span>
          <span className="mt-0.5 text-[11px] font-semibold text-ink-faint">
            of {calorieTarget}
          </span>
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <p className="font-display flex items-center gap-2 text-xl leading-tight text-ink">
            {balance.headline}
            {balance.verdict === "deficit" ? <Sparkle size={13} twinkle /> : null}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{balance.detail}</p>
          <p className="tnum mt-2 text-[11px] text-ink-faint">
            {balance.burnSource === "health" ? (
              <>
                Burned {Math.round(balance.burned)} — {Math.round(balance.restingKcal)} resting +{" "}
                {Math.round(balance.activeKcal)} active.
              </>
            ) : (
              <>
                Burn estimated at {Math.round(balance.burned)}.{" "}
                {balance.activeIgnored
                  ? "Add resting energy from Health so your active calories can count."
                  : "Add today's energy from Health for the measured number."}{" "}
                {burnHref ? (
                  <Link href={burnHref} className="text-[var(--accent)] underline">
                    Add it
                  </Link>
                ) : null}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {macros.map((macro) => (
          <div key={macro.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-ink">{macro.label}</span>
              <span className="tnum text-sm text-ink-soft">
                <span
                  className={cn(
                    "font-bold",
                    macro.status === "hit" && "text-[var(--good)]",
                    macro.status === "over" && "text-[var(--bad)]",
                  )}
                >
                  {macro.value}
                </span>
                <span className="text-ink-faint">
                  {" "}
                  / {macro.target}
                  {macro.unit}
                </span>
              </span>
            </div>
            <ProgressBar
              value={macro.value}
              max={macro.target}
              color={macro.colorVar}
              label={`${macro.label}: ${macro.value} of ${macro.target} grams`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
