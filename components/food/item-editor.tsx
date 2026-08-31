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

/**
 * Corrects the individual foods rather than the meal total.
 *
 * Only calories are typed. The other macros scale with the correction, which
 * keeps them coherent without asking for five numbers per food. Halving the
 * calories on a portion halves its protein, carbs and fat too, which is what
 * halving the portion actually does.
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

  const total = Math.round(items.reduce((n, i) => n + Number(i.kcal || 0), 0));
  const protein = Math.round(items.reduce((n, i) => n + Number(i.protein_g || 0), 0));

  function setCalories(index: number, kcal: number) {
    setItems((current) =>
      current.map((item, i) => {
        if (i !== index) return item;
        const previous = Number(item.kcal) || 0;
        // Scale the macros with the calories, so the item stays internally
        // consistent. From zero there is nothing to scale, so leave them.
        const ratio = previous > 0 ? kcal / previous : 1;
        return {
          ...item,
          kcal,
          protein_g: previous > 0 ? round1(Number(item.protein_g) * ratio) : Number(item.protein_g),
          carbs_g: previous > 0 ? round1(Number(item.carbs_g) * ratio) : Number(item.carbs_g),
          fat_g: previous > 0 ? round1(Number(item.fat_g) * ratio) : Number(item.fat_g),
          fiber_g: previous > 0 ? round1(Number(item.fiber_g) * ratio) : Number(item.fiber_g),
        };
      }),
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={meal.title}
      description="Fix any line that looks wrong. What you save here is remembered and never re-estimated."
    >
      {items.length === 0 ? (
        <p className="text-[15px] text-ink-soft">
          This meal has no itemised breakdown, so there is nothing to correct here. Use Fix the
          numbers instead.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-[var(--border)]">
            {items.map((item, index) => (
              <li key={`${item.name}-${index}`} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate text-[17px] text-ink">{item.name}</p>
                  <button
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => setItems((c) => c.filter((_, i) => i !== index))}
                    className="flex size-8 shrink-0 cursor-pointer items-center justify-center text-ink-faint transition-colors duration-150 hover:text-[var(--bad)]"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>

                <div className="mt-1.5 flex items-center gap-3">
                  <Input
                    value={item.portion}
                    aria-label={`${item.name} portion`}
                    onChange={(e) =>
                      setItems((c) =>
                        c.map((it, i) => (i === index ? { ...it, portion: e.target.value } : it)),
                      )
                    }
                    className="h-11 flex-1 text-[15px]"
                  />
                  <div className="flex w-[122px] shrink-0 items-center gap-1.5">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={String(Math.round(Number(item.kcal)))}
                      aria-label={`${item.name} calories`}
                      onChange={(e) => setCalories(index, Math.max(0, Number(e.target.value) || 0))}
                      className="tnum h-11 text-right text-[15px]"
                    />
                    <span className="text-[13px] text-ink-faint">kcal</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="tnum mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-[15px] text-ink-soft">New total</span>
            <span className="font-display text-[24px] text-ink">
              {total} kcal
              <span className="ml-2 text-[15px] text-ink-faint">{protein}g protein</span>
            </span>
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
                  await updateMealItems(meal.id, items);
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

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
