"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldRow, Input, NumberStepper } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { suggestCalorieTarget, suggestMaintenance, suggestProtein } from "@/lib/domain/macros";
import { PROGRAM_TEMPLATES, templateById } from "@/lib/domain/templates";
import { cn } from "@/lib/utils";

type Activity = "sedentary" | "light" | "moderate" | "active";

type Baseline = { dayIndex: number; position: number; weightKg: number | null; reps: number[] };

const STEPS = ["About you", "Your targets", "Your split", "Starting numbers"];

export function OnboardingFlow({ defaultName }: { defaultName: string }) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();

  const [displayName, setDisplayName] = useState(defaultName);
  const [heightCm, setHeightCm] = useState(165);
  const [age, setAge] = useState(27);
  const [weightKg, setWeightKg] = useState(62);
  const [activity, setActivity] = useState<Activity>("light");

  const suggested = useMemo(() => {
    const maintenance = suggestMaintenance({ weightKg, heightCm, age, activity });
    return {
      maintenance,
      calories: suggestCalorieTarget(maintenance),
      protein: suggestProtein(weightKg),
    };
  }, [weightKg, heightCm, age, activity]);

  const [calorieTarget, setCalorieTarget] = useState<number | null>(null);
  const [proteinG, setProteinG] = useState<number | null>(null);
  const [stepTarget, setStepTarget] = useState(8000);

  const [templateId, setTemplateId] = useState(PROGRAM_TEMPLATES[0].id);
  const template = templateById(templateId)!;

  const [baselines, setBaselines] = useState<Record<string, Baseline>>({});

  function baselineFor(dayIndex: number, position: number): Baseline {
    const key = `${dayIndex}:${position}`;
    if (baselines[key]) return baselines[key];
    const exercise = template.days[dayIndex].exercises[position];
    return {
      dayIndex,
      position,
      weightKg: exercise.startingWeightKg ?? null,
      reps: exercise.startingReps ?? [],
    };
  }

  function setBaseline(next: Baseline) {
    setBaselines((prev) => ({ ...prev, [`${next.dayIndex}:${next.position}`]: next }));
  }

  function submit() {
    startTransition(async () => {
      try {
        const filled = template.days.flatMap((day, dayIndex) =>
          day.exercises.map((_, position) => baselineFor(dayIndex, position)),
        );
        await completeOnboarding({
          displayName: displayName.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          heightCm,
          age,
          weightKg,
          activity,
          stepTarget,
          calorieTarget,
          proteinG,
          templateId,
          baselines: filled.filter((b) => b.reps.length > 0),
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not finish setting up.");
      }
    });
  }

  const canContinue = step === 0 ? displayName.trim().length > 0 : true;
  const isLast = step === STEPS.length - 1;

  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-safe pb-12">
      <header className="pt-8 pb-6">
        <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length} aria-label="Setup progress">
          {STEPS.map((label, index) => (
            <span
              key={label}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                index <= step ? "glitter-fill" : "bg-surface-2",
              )}
            />
          ))}
        </div>
        <p className="mt-4 text-xs font-semibold tracking-[0.14em] text-ink-faint uppercase">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="font-display mt-1 text-[28px] leading-tight font-semibold text-ink">
          {STEPS[step]}
        </h1>
      </header>

      {step === 0 ? (
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-ink-soft">
            This is only used to work out your calorie targets. Nothing is shared anywhere.
          </p>

          <FieldRow label="What should the app call you?" htmlFor="name">
            <Input
              id="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="given-name"
              placeholder="Your name"
            />
          </FieldRow>

          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Height" htmlFor="height">
              <NumberStepper
                value={heightCm}
                onChange={setHeightCm}
                min={120}
                max={220}
                step={1}
                suffix="cm"
                label="Height in centimetres"
              />
            </FieldRow>
            <FieldRow label="Age" htmlFor="age">
              <NumberStepper
                value={age}
                onChange={setAge}
                min={14}
                max={90}
                step={1}
                label="Age in years"
              />
            </FieldRow>
          </div>

          <FieldRow label="Weight" hint="Roughly is fine. You can update it any time.">
            <NumberStepper
              value={weightKg}
              onChange={setWeightKg}
              min={30}
              max={250}
              step={0.5}
              suffix="kg"
              label="Body weight in kilograms"
            />
          </FieldRow>

          <FieldRow label="How much do you move outside the gym?">
            <Segmented
              value={activity}
              onChange={setActivity}
              label="Activity level"
              options={[
                { value: "sedentary", label: "Desk" },
                { value: "light", label: "Some" },
                { value: "moderate", label: "Lots" },
                { value: "active", label: "Loads" },
              ]}
            />
          </FieldRow>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-5">
          <div className="card p-5">
            <p className="text-xs font-bold tracking-[0.14em] text-ink-faint uppercase">
              Maintenance
            </p>
            <p className="tnum font-display mt-1 text-3xl font-bold text-ink">
              {suggested.maintenance} kcal
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              That is roughly what you burn on a normal day. A deficit of about 20% is enough to
              lose fat without losing the muscle you are working for.
            </p>
          </div>

          <FieldRow
            label="Daily calories"
            hint={`Suggested: ${suggested.calories} kcal, which is a 20% deficit.`}
          >
            <NumberStepper
              value={calorieTarget ?? suggested.calories}
              onChange={setCalorieTarget}
              min={1000}
              max={6000}
              step={50}
              suffix="kcal"
              label="Daily calorie target"
            />
          </FieldRow>

          <FieldRow
            label="Daily protein"
            hint={`Suggested: ${suggested.protein}g, which is 1.8g per kilo. Protein is what keeps the muscle while the fat goes.`}
          >
            <NumberStepper
              value={proteinG ?? suggested.protein}
              onChange={setProteinG}
              min={20}
              max={400}
              step={5}
              suffix="g"
              label="Daily protein target"
            />
          </FieldRow>

          <FieldRow label="Daily steps" hint="Apple Health fills this in for you once connected.">
            <NumberStepper
              value={stepTarget}
              onChange={setStepTarget}
              min={1000}
              max={40000}
              step={500}
              label="Daily step target"
            />
          </FieldRow>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-ink-soft">
            Pick whichever is closest. Every exercise, rep range and rest time is editable
            afterwards, so this is a starting point rather than a commitment.
          </p>
          {PROGRAM_TEMPLATES.map((option) => {
            const active = option.id === templateId;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTemplateId(option.id)}
                aria-pressed={active}
                className={cn(
                  "w-full cursor-pointer rounded-3xl border p-4 text-left transition-colors duration-200",
                  active
                    ? "border-[var(--ring)] bg-surface shadow-[var(--shadow-lift)]"
                    : "border-line bg-surface hover:border-line-strong",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-base font-semibold text-ink">{option.name}</h2>
                  {active ? (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--pink-deep)] text-white">
                      <Check className="size-3.5" aria-hidden />
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{option.blurb}</p>
                <p className="mt-2 text-xs font-semibold text-ink-faint">{option.cadence}</p>
              </button>
            );
          })}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-soft">
            If you already know what you lifted last time, put it in. The app then has something
            to beat from your very first session instead of spending a week saying &ldquo;first
            time logged&rdquo;. Leave anything blank that you do not know.
          </p>

          {template.days.map((day, dayIndex) => (
            <section key={day.name} className="card p-4">
              <h2 className="font-display text-base font-semibold text-ink">{day.name}</h2>
              {day.exercises.length === 0 ? (
                <p className="mt-2 text-sm text-ink-soft">
                  You will fill this day in yourself once you are inside.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {day.exercises.map((exercise, position) => {
                    const baseline = baselineFor(dayIndex, position);
                    const weightless =
                      exercise.loadType === "bodyweight" || exercise.loadType === "banded";
                    return (
                      <li key={exercise.exercise} className="border-t border-line pt-3 first:border-0 first:pt-0">
                        <p className="text-sm font-semibold text-ink">
                          {exercise.displayAs ?? exercise.exercise}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {weightless ? null : (
                            <NumberStepper
                              value={baseline.weightKg ?? 0}
                              onChange={(next) => setBaseline({ ...baseline, weightKg: next })}
                              min={0}
                              max={700}
                              step={2.5}
                              size="sm"
                              suffix={exercise.loadType === "dumbbell_pair" ? "kg ea" : "kg"}
                              label={`${exercise.exercise} starting weight`}
                              className="w-[150px]"
                            />
                          )}
                          <RepsInput
                            value={baseline.reps}
                            onChange={(reps) => setBaseline({ ...baseline, reps })}
                            label={`${exercise.exercise} last reps`}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      ) : null}

      <div className="mt-8 flex gap-3">
        {step > 0 ? (
          <Button variant="soft" size="lg" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </Button>
        ) : null}

        {isLast ? (
          <Button variant="glitter" size="lg" block loading={pending} onClick={submit}>
            <Sparkles className="size-4" aria-hidden />
            Let&rsquo;s go
          </Button>
        ) : (
          <Button
            variant="glitter"
            size="lg"
            block
            disabled={!canContinue}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>
    </main>
  );
}

/** Comma separated reps, because typing "13, 13, 12" is faster than three steppers. */
function RepsInput({
  value,
  onChange,
  label,
}: {
  value: number[];
  onChange: (next: number[]) => void;
  label: string;
}) {
  const [text, setText] = useState(value.join(", "));

  return (
    <Input
      value={text}
      inputMode="numeric"
      aria-label={label}
      placeholder="Last reps, e.g. 12, 12, 10"
      className="h-11 min-w-[150px] flex-1 text-sm"
      onChange={(e) => {
        setText(e.target.value);
        onChange(
          e.target.value
            .split(/[,\s]+/)
            .map((part) => Number.parseInt(part, 10))
            .filter((n) => Number.isFinite(n) && n > 0 && n <= 200),
        );
      }}
    />
  );
}
