"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteFoodMemory, setFoodMemoryPinned } from "@/lib/actions/food";
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

export function FoodMemory({ memories }: { memories: MemoryRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  if (memories.length === 0) {
    return (
      <p className="text-[15px] leading-relaxed text-ink-soft">
        Nothing learned yet. Log a few meals and the portions you actually eat show up here, ready
        to be reused the next time the same food turns up in a photo.
      </p>
    );
  }

  return (
    <div>
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
