/**
 * Nutrition maths. Two questions get answered every evening: am I actually in
 * a deficit, and did I hit protein. Everything else is secondary.
 */

export type MacroTotals = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

export type MacroTargets = MacroTotals;

export type MacroKey = keyof MacroTotals;

export const EMPTY_TOTALS: MacroTotals = {
  kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
};

export function sumMeals(meals: Partial<MacroTotals>[]): MacroTotals {
  return meals.reduce<MacroTotals>(
    (acc, m) => ({
      kcal: acc.kcal + (Number(m.kcal) || 0),
      protein_g: acc.protein_g + (Number(m.protein_g) || 0),
      carbs_g: acc.carbs_g + (Number(m.carbs_g) || 0),
      fat_g: acc.fat_g + (Number(m.fat_g) || 0),
      fiber_g: acc.fiber_g + (Number(m.fiber_g) || 0),
    }),
    { ...EMPTY_TOTALS },
  );
}

export type MacroStatus = "short" | "close" | "hit" | "over";

export type MacroLine = {
  key: MacroKey;
  label: string;
  unit: string;
  value: number;
  target: number;
  pct: number;
  status: MacroStatus;
  /** Protein and fibre are floors to reach. Carbs and fat are ceilings. */
  kind: "floor" | "ceiling";
  colorVar: string;
};

const MACRO_META: Record<
  Exclude<MacroKey, "kcal">,
  { label: string; unit: string; kind: "floor" | "ceiling"; colorVar: string }
> = {
  protein_g: { label: "Protein", unit: "g", kind: "floor", colorVar: "var(--pink-deep)" },
  carbs_g: { label: "Carbs", unit: "g", kind: "ceiling", colorVar: "var(--lilac-deep)" },
  fat_g: { label: "Fat", unit: "g", kind: "ceiling", colorVar: "var(--gold)" },
  fiber_g: { label: "Fibre", unit: "g", kind: "floor", colorVar: "var(--mint)" },
};

export function macroLines(totals: MacroTotals, targets: MacroTargets): MacroLine[] {
  return (Object.keys(MACRO_META) as Exclude<MacroKey, "kcal">[]).map((key) => {
    const meta = MACRO_META[key];
    const value = Math.round(totals[key]);
    const target = Math.round(targets[key]) || 1;
    const pct = (value / target) * 100;
    return {
      key,
      label: meta.label,
      unit: meta.unit,
      value,
      target,
      pct,
      kind: meta.kind,
      colorVar: meta.colorVar,
      status: statusFor(pct, meta.kind),
    };
  });
}

function statusFor(pct: number, kind: "floor" | "ceiling"): MacroStatus {
  if (kind === "floor") {
    if (pct >= 95) return "hit";
    if (pct >= 80) return "close";
    return "short";
  }
  if (pct > 110) return "over";
  if (pct >= 80) return "hit";
  return "close";
}

// ---------------------------------------------------------------------------

export type EnergyVerdict = "pending" | "deficit" | "maintenance" | "surplus";

export type EnergyBalance = {
  consumed: number;
  burned: number;
  /** Whether the burn came from Apple Health or from the BMR estimate. */
  burnSource: "health" | "estimate";
  net: number;
  verdict: EnergyVerdict;
  headline: string;
  detail: string;
  /** Remaining against the calorie target, which can go negative. */
  remainingToTarget: number;
};

/**
 * Apple Health reports resting and active energy separately, and together they
 * are a measurement rather than a guess. When resting energy is missing the
 * Mifflin-St Jeor maintenance figure stands in, which is conservative rather
 * than flattering.
 */
export function energyBalance(input: {
  consumed: number;
  maintenanceKcal: number;
  activeKcal: number;
  basalKcal?: number | null;
  calorieTarget: number;
}): EnergyBalance {
  const { consumed, maintenanceKcal, activeKcal, basalKcal, calorieTarget } = input;
  const hasHealthBasal = typeof basalKcal === "number" && basalKcal > 0;
  const burnSource: "health" | "estimate" = hasHealthBasal ? "health" : "estimate";
  const burned = (hasHealthBasal ? basalKcal : maintenanceKcal) + activeKcal;
  const net = consumed - burned;
  const remainingToTarget = calorieTarget - consumed;

  if (consumed <= 0) {
    return {
      consumed,
      burned,
      burnSource,
      net,
      verdict: "pending",
      headline: "Nothing logged yet",
      detail: `Target is ${Math.round(calorieTarget)} kcal today.`,
      remainingToTarget,
    };
  }

  if (net <= -200) {
    return {
      consumed,
      burned,
      burnSource,
      net,
      verdict: "deficit",
      headline: `${Math.abs(Math.round(net))} kcal deficit`,
      detail: `Ate ${Math.round(consumed)}, burned about ${Math.round(burned)}.`,
      remainingToTarget,
    };
  }

  if (net < 200) {
    return {
      consumed,
      burned,
      burnSource,
      net,
      verdict: "maintenance",
      headline: "Roughly maintenance",
      detail: `${Math.round(consumed)} in, about ${Math.round(burned)} out.`,
      remainingToTarget,
    };
  }

  return {
    consumed,
    burned,
    burnSource,
    net,
    verdict: "surplus",
    headline: `${Math.round(net)} kcal surplus`,
    detail: `Ate ${Math.round(consumed)}, burned about ${Math.round(burned)}.`,
    remainingToTarget,
  };
}

/**
 * Mifflin-St Jeor for women, times a light activity factor. Used only as a
 * starting suggestion during onboarding, and always editable afterwards.
 */
export function suggestMaintenance(input: {
  weightKg: number;
  heightCm: number;
  age: number;
  activity: "sedentary" | "light" | "moderate" | "active";
}): number {
  const { weightKg, heightCm, age, activity } = input;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const factor = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 }[activity];
  return Math.round((bmr * factor) / 10) * 10;
}

/** A 20% cut, floored so the deficit never becomes an eating disorder. */
export function suggestCalorieTarget(maintenance: number): number {
  return Math.max(1200, Math.round((maintenance * 0.8) / 10) * 10);
}

/** 1.8 g/kg is the practical hypertrophy number for a woman in a deficit. */
export function suggestProtein(weightKg: number): number {
  return Math.round(weightKg * 1.8);
}
