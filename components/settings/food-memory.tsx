"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteFoodMemory, setFoodMemoryPinned } from "@/lib/actions/food";
import { setCookingOil } from "@/lib/actions/settings";
import { COOKING_OIL, type CookingOil } from "@/lib/domain/food-schema";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type MemoryRow = {
  id: string;
  name: string;
  portion: string;
  kcal: number;
  protein_g: number;
  times_logged: number;
  is_pinned: boolean;
};

export function FoodMemory({
  memories,
  cookingOil,
}: {
  memories: MemoryRow[];
  cookingOil: CookingOil;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <div>
      <OilSetting value={cookingOil} onDone={() => router.refresh()} />

      {memories.length === 0 ? (
        <p className="mt-5 border-t border-line pt-5 text-[15px] leading-relaxed text-ink-soft">
          Nothing learned yet. Log a few meals and the portions you actually eat show up here,
          ready to be reused the next time the same food turns up in a photo.
        </p>
      ) : (
        <div className="mt-5 border-t border-line pt-5">
      <p className="text-[15px] leading-relaxed text-ink-soft">
        Portions learned from what you have logged. Pin one and it is treated as fact rather than
        re-estimated every time.
      </p>

      <ul className="mt-4 divide-y divide-[var(--border)]">
        {memories.map((memory) => (
          <li key={memory.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] text-ink">{memory.name}</p>
              <p className="tnum text-[13px] text-ink-faint">
                {memory.portion} · {memory.kcal} kcal · {Math.round(memory.protein_g)}g protein ·{" "}
                {memory.times_logged}×
              </p>
            </div>

            <PinButton memory={memory} onDone={() => router.refresh()} />

            <button
              type="button"
              aria-label={`Forget ${memory.name}`}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await deleteFoodMemory(memory.id);
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Could not forget that.");
                  }
                })
              }
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center text-ink-faint transition-colors duration-150 hover:text-[var(--bad)]"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Invisible cooking fat is one of the biggest errors in estimating a
 * home-cooked meal, and it is not something the app should be guessing.
 * Assuming a tablespoon for someone who uses one spray adds about 110 kcal a
 * dish, quietly, every time.
 */
function OilSetting({ value, onDone }: { value: CookingOil; onDone: () => void }) {
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <p className="eyebrow">How you cook</p>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
        Used for oil the camera cannot see. Say a different amount when you log and that wins.
      </p>
      <Select
        className="mt-3"
        value={value}
        disabled={pending}
        aria-label="How much oil you cook with"
        onChange={(e) =>
          startTransition(async () => {
            try {
              await setCookingOil(e.target.value);
              toast.success("Saved.");
              onDone();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not save that.");
            }
          })
        }
      >
        {(Object.keys(COOKING_OIL) as CookingOil[]).map((key) => (
          <option key={key} value={key}>
            {COOKING_OIL[key].blurb} · about {Math.round(COOKING_OIL[key].grams * 9)} kcal
          </option>
        ))}
      </Select>
    </div>
  );
}

function PinButton({ memory, onDone }: { memory: MemoryRow; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const Icon = memory.is_pinned ? Pin : PinOff;

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={memory.is_pinned}
      aria-label={memory.is_pinned ? `Unpin ${memory.name}` : `Pin ${memory.name}`}
      onClick={() =>
        startTransition(async () => {
          try {
            await setFoodMemoryPinned(memory.id, !memory.is_pinned);
            onDone();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not change that.");
          }
        })
      }
      className={cn(
        "flex size-10 shrink-0 cursor-pointer items-center justify-center transition-colors duration-150",
        memory.is_pinned ? "text-[var(--accent)]" : "text-ink-faint hover:text-ink",
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
