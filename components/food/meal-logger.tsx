"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Loader2, Pencil, Plus, Trash2, Utensils } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldRow, Input, NumberStepper, Select } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { createMeal, deleteMeal, updateMeal } from "@/lib/actions/food";
import { MEAL_TYPES } from "@/lib/domain/food-schema";
import { celebrate } from "@/lib/celebrate";
import type { Meal } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type MealType = (typeof MEAL_TYPES)[number];

const TYPE_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const CONFIDENCE_COPY = {
  high: "Confident",
  medium: "Reasonably sure",
  low: "Rough guess, worth checking",
} as const;

export function MealLogger({
  meals,
  photoUrls,
  today,
}: {
  meals: Meal[];
  photoUrls: Record<string, string>;
  today: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [analysing, setAnalysing] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [editing, setEditing] = useState<Meal | null>(null);

  async function onPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setAnalysing(true);
    try {
      const body = new FormData();
      body.append("photo", file);
      body.append("log_date", today);

      const response = await fetch("/api/food/analyze", { method: "POST", body });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error ?? "Could not read that photo.");

      celebrate();
      toast.success(`Logged ${payload.meal.title}, about ${payload.meal.kcal} kcal.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setAnalysing(false);
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={onPhoto}
        aria-label="Take a photo of your meal"
      />

      <div className="flex gap-2">
        <Button
          variant="glitter"
          size="lg"
          block
          loading={analysing}
          onClick={() => fileRef.current?.click()}
        >
          {analysing ? null : <Camera className="size-4" aria-hidden />}
          {analysing ? "Reading the plate" : "Photograph a meal"}
        </Button>
        <Button
          variant="soft"
          size="lg"
          aria-label="Add a meal by hand"
          onClick={() => setManualOpen(true)}
        >
          <Plus className="size-5" aria-hidden />
        </Button>
      </div>

      {analysing ? (
        <div
          role="status"
          aria-live="polite"
          className="card mt-3 flex items-center gap-3 p-4 text-sm text-ink-soft"
        >
          <Loader2 className="size-4 shrink-0 animate-spin text-[var(--pink-deep)]" aria-hidden />
          Working out what is on the plate. This takes a few seconds.
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {meals.length === 0 && !analysing ? (
          <div className="card">
            <EmptyState
              icon={Utensils}
              title="Nothing logged today"
              body="Photograph your plate and the app fills in calories, protein, carbs, fat and fibre for you."
            />
          </div>
        ) : null}

        {meals.map((meal) => (
          <article key={meal.id} className="card overflow-hidden p-0">
            <div className="flex gap-3 p-4">
              {meal.photo_path && photoUrls[meal.photo_path] ? (
                <Image
                  src={photoUrls[meal.photo_path]}
                  alt=""
                  width={72}
                  height={72}
                  unoptimized
                  className="size-18 shrink-0 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex size-18 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-ink-faint">
                  <Utensils className="size-5" aria-hidden />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                      {TYPE_LABEL[meal.meal_type]}
                    </p>
                    <h3 className="font-display truncate text-base leading-tight font-semibold text-ink">
                      {meal.title}
                    </h3>
                  </div>
                  <span className="tnum font-display shrink-0 text-lg font-bold text-ink">
                    {meal.kcal}
                  </span>
                </div>

                <dl className="tnum mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-soft">
                  <Macro label="P" value={meal.protein_g} />
                  <Macro label="C" value={meal.carbs_g} />
                  <Macro label="F" value={meal.fat_g} />
                  <Macro label="Fibre" value={meal.fiber_g} />
                </dl>
              </div>
            </div>

            {meal.ai_note || meal.ai_confidence ? (
              <p className="border-t border-line bg-surface-2 px-4 py-2 text-xs leading-relaxed text-ink-soft">
                {meal.ai_confidence ? (
                  <span
                    className={cn(
                      "font-bold",
                      meal.ai_confidence === "low" && "text-[var(--coral)]",
                    )}
                  >
                    {CONFIDENCE_COPY[meal.ai_confidence]}.{" "}
                  </span>
                ) : null}
                {meal.ai_note}
              </p>
            ) : null}

            <div className="flex border-t border-line">
              <button
                type="button"
                onClick={() => setEditing(meal)}
                className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 text-xs font-bold text-ink-soft transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
              >
                <Pencil className="size-3.5" aria-hidden />
                Fix the numbers
              </button>
              <DeleteMealButton mealId={meal.id} title={meal.title} />
            </div>
          </article>
        ))}
      </div>

      <MealSheet
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Add a meal"
        today={today}
        onSubmit={async (values) => {
          await createMeal({ ...values, logDate: today });
          setManualOpen(false);
          router.refresh();
        }}
      />

      <MealSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Fix the numbers"
        today={today}
        meal={editing}
        onSubmit={async (values) => {
          if (!editing) return;
          await updateMeal(editing.id, { ...values, logDate: editing.log_date });
          setEditing(null);
          router.refresh();
        }}
      />
    </>
  );
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="font-bold text-ink">{Math.round(Number(value))}g</dd>
    </div>
  );
}

function DeleteMealButton({ mealId, title }: { mealId: string; title: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirming) {
          setConfirming(true);
          window.setTimeout(() => setConfirming(false), 4000);
          return;
        }
        startTransition(async () => {
          try {
            await deleteMeal(mealId);
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not delete that.");
          }
        });
      }}
      className={cn(
        "flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 border-l border-line text-xs font-bold transition-colors duration-150",
        confirming
          ? "bg-[var(--coral)] text-white"
          : "text-ink-soft hover:bg-surface-2 hover:text-[var(--coral)]",
      )}
      aria-label={confirming ? `Confirm deleting ${title}` : `Delete ${title}`}
    >
      <Trash2 className="size-3.5" aria-hidden />
      {confirming ? "Tap again" : "Delete"}
    </button>
  );
}

type MealValues = {
  mealType: MealType;
  title: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

function MealSheet({
  open,
  onClose,
  title,
  meal,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  today: string;
  meal?: Meal | null;
  onSubmit: (values: MealValues) => Promise<void>;
}) {
  const [values, setValues] = useState<MealValues>(() => fromMeal(meal));
  const [pending, startTransition] = useTransition();
  const [key, setKey] = useState(0);

  // Re-seed the form whenever a different meal is opened.
  const seedKey = meal?.id ?? "new";
  if (key !== hash(seedKey)) {
    setKey(hash(seedKey));
    setValues(fromMeal(meal));
  }

  function save() {
    if (!values.title.trim()) {
      toast.error("Give it a name so you recognise it later.");
      return;
    }
    startTransition(async () => {
      try {
        await onSubmit(values);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save that.");
      }
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <FieldRow label="What was it?" htmlFor="meal-title">
          <Input
            id="meal-title"
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            placeholder="Chicken rice bowl"
          />
        </FieldRow>

        <FieldRow label="Meal" htmlFor="meal-type">
          <Select
            id="meal-type"
            value={values.mealType}
            onChange={(e) => setValues((v) => ({ ...v, mealType: e.target.value as MealType }))}
          >
            {MEAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABEL[type]}
              </option>
            ))}
          </Select>
        </FieldRow>

        <FieldRow label="Calories">
          <NumberStepper
            value={values.kcal}
            onChange={(kcal) => setValues((v) => ({ ...v, kcal }))}
            min={0}
            max={6000}
            step={10}
            suffix="kcal"
            label="Calories"
          />
        </FieldRow>

        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["protein_g", "Protein"],
              ["carbs_g", "Carbs"],
              ["fat_g", "Fat"],
              ["fiber_g", "Fibre"],
            ] as const
          ).map(([key, label]) => (
            <FieldRow key={key} label={label}>
              <NumberStepper
                value={values[key]}
                onChange={(next) => setValues((v) => ({ ...v, [key]: next }))}
                min={0}
                max={800}
                step={1}
                suffix="g"
                label={`${label} in grams`}
                size="sm"
              />
            </FieldRow>
          ))}
        </div>

        <Button variant="glitter" size="lg" block loading={pending} onClick={save}>
          Save
        </Button>
      </div>
    </Sheet>
  );
}

function fromMeal(meal?: Meal | null): MealValues {
  return {
    mealType: meal?.meal_type ?? "snack",
    title: meal?.title ?? "",
    kcal: meal?.kcal ?? 0,
    protein_g: Number(meal?.protein_g ?? 0),
    carbs_g: Number(meal?.carbs_g ?? 0),
    fat_g: Number(meal?.fat_g ?? 0),
    fiber_g: Number(meal?.fiber_g ?? 0),
  };
}

function hash(value: string) {
  let out = 0;
  for (let i = 0; i < value.length; i += 1) out = (out * 31 + value.charCodeAt(i)) | 0;
  return out;
}
