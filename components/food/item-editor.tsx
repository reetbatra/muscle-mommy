"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { updateMealItems } from "@/lib/actions/food";
import { MEAL_TYPES } from "@/lib/domain/food-schema";
import type { Meal, MealItem } from "@/lib/domain/types";

const MACROS = [
  { key: "protein_g", label: "P" },
  { key: "carbs_g", label: "C" },
  { key: "fat_g", label: "F" },
  { key: "fiber_g", label: "Fib" },
] as const;

const TYPE_LABEL: Record<(typeof MEAL_TYPES)[number], string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const BLANK: MealItem = {
  name: "",
  portion: "",
  kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
};

/**
 * Everything about a logged meal is editable here: its name, which meal it
 * was, what foods were in it, what each one was called, the portion, and every
 * macro. Foods it missed can be added and foods it invented can be deleted.
 *
 * That matters beyond tidiness. Whatever is saved is written back to the food
 * memory and pinned, so every correction teaches it and is never re-guessed.
 *
 * Calories are derived from the macros at 4/4/9 rather than typed, which is the
 * only way the numbers cannot contradict each other.
 */
export function ItemEditor({
  meal,
  open,
  onClose,
}: {
  meal: Meal | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(meal?.title ?? "");
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]>(meal?.meal_type ?? "snack");
  const [items, setItems] = useState<MealItem[]>(() => seedItems(meal));
  const [seed, setSeed] = useState(meal?.id ?? "");
  const [pending, startTransition] = useTransition();

  if (seed !== (meal?.id ?? "")) {
    setSeed(meal?.id ?? "");
    setTitle(meal?.title ?? "");
    setMealType(meal?.meal_type ?? "snack");
    setItems(seedItems(meal));
  }
  if (!meal) return null;

  const priced = items.map((item) => ({ ...item, kcal: caloriesOf(item) }));
  const total = Math.round(priced.reduce((n, i) => n + i.kcal, 0));
  const totalFat = round1(priced.reduce((n, i) => n + Number(i.fat_g || 0), 0));
  const totalProtein = Math.round(priced.reduce((n, i) => n + Number(i.protein_g || 0), 0));

  const patch = (index: number, changes: Partial<MealItem>) =>
    setItems((current) => current.map((it, i) => (i === index ? { ...it, ...changes } : it)));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit meal"
      description="Change anything. What you save is remembered and never re-estimated."
    >
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Input
          value={title}
          aria-label="Meal name"
          placeholder="What was it?"
          onChange={(e) => setTitle(e.target.value)}
        />
        <Select
          value={mealType}
          aria-label="Which meal"
          className="w-[124px]"
          onChange={(e) => setMealType(e.target.value as (typeof MEAL_TYPES)[number])}
        >
          {MEAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABEL[type]}
            </option>
          ))}
        </Select>
      </div>

      <ul className="mt-2 divide-y divide-[var(--border)]">
        {items.map((item, index) => (
          <li key={index} className="py-3.5">
            <div className="flex items-center gap-2">
              <Input
                value={item.name}
                aria-label={`Food ${index + 1} name`}
                placeholder="Food"
                onChange={(e) => patch(index, { name: e.target.value })}
                className="h-11 min-w-0 flex-1"
              />
              <span className="tnum w-[70px] shrink-0 text-right text-[15px] text-ink-faint">
                {Math.round(caloriesOf(item))} kcal
              </span>
              <button
                type="button"
                aria-label={`Remove ${item.name || `food ${index + 1}`}`}
                onClick={() => setItems((c) => c.filter((_, i) => i !== index))}
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center text-ink-faint transition-colors duration-150 hover:text-[var(--bad)]"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>

            <Input
              value={item.portion}
              aria-label={`Food ${index + 1} portion`}
              placeholder="How much, e.g. 200g"
              onChange={(e) => patch(index, { portion: e.target.value })}
              className="mt-2 h-10 text-[15px]"
            />

            <div className="mt-2 grid grid-cols-4 gap-2">
              {MACROS.map((macro) => (
                <label key={macro.key} className="block">
                  <span className="eyebrow block">{macro.label}</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    aria-label={`Food ${index + 1} ${macro.label}`}
                    value={String(Number(item[macro.key]) || 0)}
                    onChange={(e) =>
                      patch(index, { [macro.key]: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="tnum mt-1 h-11 px-2 text-center text-[15px]"
                  />
                </label>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setItems((c) => [...c, { ...BLANK }])}
        className="mt-3 flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 border border-dashed border-line-strong text-[15px] text-ink-soft transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
      >
        <Plus className="size-4" aria-hidden />
        Add a food
      </button>

      <div className="mt-4 border-t border-line pt-4">
        <div className="tnum flex items-baseline justify-between">
          <span className="text-[15px] text-ink-soft">New total</span>
          <span className="font-display text-[26px] text-ink">{total} kcal</span>
        </div>
        <p className="tnum mt-1 text-right text-[14px] text-ink-faint">
          {totalProtein}g protein · {totalFat}g fat
        </p>
      </div>

      <Button
        variant="glitter"
        size="lg"
        block
        className="mt-5"
        loading={pending}
        onClick={() => {
          const named = priced.filter((i) => i.name.trim().length > 0);
          if (named.length === 0) {
            toast.error("Give at least one food a name.");
            return;
          }
          if (!title.trim()) {
            toast.error("Give the meal a name.");
            return;
          }
          startTransition(async () => {
            try {
              await updateMealItems(meal.id, named, { title: title.trim(), mealType });
              toast.success("Saved, and those portions are pinned now.");
              onClose();
              router.refresh();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not save that.");
            }
          });
        }}
      >
        Save
      </Button>
    </Sheet>
  );
}

/**
 * A meal typed in by hand has no breakdown. Rather than showing an empty
 * editor, it starts as a single food carrying the meal's own totals, which can
 * then be renamed or split up.
 */
function seedItems(meal: Meal | null): MealItem[] {
  if (!meal) return [];
  if (meal.items?.length) return meal.items;
  return [
    {
      name: meal.title,
      portion: "1 serving",
      kcal: meal.kcal,
      protein_g: Number(meal.protein_g),
      carbs_g: Number(meal.carbs_g),
      fat_g: Number(meal.fat_g),
      fiber_g: Number(meal.fiber_g),
    },
  ];
}

/** Atwater factors. Fibre is already inside the carbohydrate figure. */
function caloriesOf(item: MealItem): number {
  return (
    Number(item.protein_g || 0) * 4 + Number(item.carbs_g || 0) * 4 + Number(item.fat_g || 0) * 9
  );
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
