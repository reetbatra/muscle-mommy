"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { updateMealItems } from "@/lib/actions/food";
import type { Meal, MealItem } from "@/lib/domain/types";

const MACROS = [
  { key: "protein_g", label: "P" },
  { key: "carbs_g", label: "C" },
  { key: "fat_g", label: "F" },
  { key: "fiber_g", label: "Fib" },
] as const;

/**
 * Corrects the individual foods in a meal, macro by macro.
 *
 * Calories are derived from the macros at 4/4/9 rather than typed. That is the
 * only way the numbers cannot contradict each other: a halwa saved at 200 kcal
 * with 62g of carbs is not a thing, and editing only the total used to allow
 * exactly that. It also means fixing an overstated fat figure immediately
 * lowers the calories, which is what you would expect it to do.
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
  const [items, setItems] = useState<MealItem[]>(meal?.items ?? []);
  const [seed, setSeed] = useState(meal?.id ?? "");
  const [pending, startTransition] = useTransition();

  if (seed !== (meal?.id ?? "")) {
    setSeed(meal?.id ?? "");
    setItems(meal?.items ?? []);
  }
  if (!meal) return null;

  const withCalories = items.map((item) => ({ ...item, kcal: caloriesOf(item) }));
  const total = Math.round(withCalories.reduce((n, i) => n + i.kcal, 0));
  const totalFat = round1(withCalories.reduce((n, i) => n + Number(i.fat_g || 0), 0));
  const totalProtein = Math.round(withCalories.reduce((n, i) => n + Number(i.protein_g || 0), 0));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={meal.title}
      description="Fix any number that looks wrong. Calories follow the macros, and what you save is remembered."
    >
      {items.length === 0 ? (
        <p className="text-[15px] text-ink-soft">
          This meal has no itemised breakdown, so there is nothing to correct here.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-[var(--border)]">
            {items.map((item, index) => (
              <li key={`${item.name}-${index}`} className="py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate text-[17px] text-ink">{item.name}</p>
                  <span className="tnum shrink-0 text-[15px] text-ink-faint">
                    {Math.round(caloriesOf(item))} kcal
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => setItems((c) => c.filter((_, i) => i !== index))}
                    className="flex size-8 shrink-0 cursor-pointer items-center justify-center text-ink-faint transition-colors duration-150 hover:text-[var(--bad)]"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>

                <Input
                  value={item.portion}
                  aria-label={`${item.name} portion`}
                  onChange={(e) =>
                    setItems((c) =>
                      c.map((it, i) => (i === index ? { ...it, portion: e.target.value } : it)),
                    )
                  }
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
                        aria-label={`${item.name} ${macro.label}`}
                        value={String(Number(item[macro.key]) || 0)}
                        onChange={(e) =>
                          setItems((c) =>
                            c.map((it, i) =>
                              i === index
                                ? { ...it, [macro.key]: Math.max(0, Number(e.target.value) || 0) }
                                : it,
                            ),
                          )
                        }
                        className="tnum mt-1 h-11 px-2 text-center text-[15px]"
                      />
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>

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
            onClick={() =>
              startTransition(async () => {
                try {
                  await updateMealItems(meal.id, withCalories);
                  toast.success("Saved, and those portions are pinned now.");
                  onClose();
                  router.refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not save that.");
                }
              })
            }
          >
            Save corrections
          </Button>
        </>
      )}
    </Sheet>
  );
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
