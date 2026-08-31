"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldRow, Input, NumberStepper } from "@/components/ui/field";
import { updateProfile } from "@/lib/actions/settings";
import { trimNumber } from "@/lib/utils";
import type { Profile } from "@/lib/domain/types";

type GymProfile = Profile & {
  dumbbell_rack: (number | string)[];
  machine_increment_kg: number | string;
  barbell_increment_kg: number | string;
};

/**
 * The rack is not a preference, it is the reason the app can say "go to 5kg"
 * instead of "add 2.5kg" on a 2.5kg dumbbell.
 */
export function GymForm({ profile }: { profile: GymProfile }) {
  const [name, setName] = useState(profile.display_name ?? "");
  const [rack, setRack] = useState<number[]>(
    () => (profile.dumbbell_rack ?? []).map(Number).sort((a, b) => a - b),
  );
  const [newWeight, setNewWeight] = useState(2.5);
  const [machine, setMachine] = useState(Number(profile.machine_increment_kg));
  const [barbell, setBarbell] = useState(Number(profile.barbell_increment_kg));
  const [pending, startTransition] = useTransition();

  function save() {
    if (rack.length === 0) {
      toast.error("Leave at least one dumbbell on the rack.");
      return;
    }
    startTransition(async () => {
      try {
        await updateProfile({
          display_name: name.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          weight_unit: profile.weight_unit,
          dumbbell_rack: rack,
          machine_increment_kg: machine,
          barbell_increment_kg: barbell,
        });
        toast.success("Saved.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save that.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <FieldRow label="Your name" htmlFor="display-name">
        <Input id="display-name" value={name} onChange={(e) => setName(e.target.value)} />
      </FieldRow>

      <FieldRow
        label="Dumbbells you actually have"
        hint="Weight per hand. When every set hits the ceiling, the app moves you to the next one on this list rather than inventing a number."
      >
        <ul className="flex flex-wrap gap-2">
          {rack.map((weight) => (
            <li key={weight}>
              <button
                type="button"
                onClick={() => setRack((r) => r.filter((w) => w !== weight))}
                aria-label={`Remove ${trimNumber(weight)}kg from the rack`}
                className="tnum flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-bold text-ink transition-colors duration-150 hover:border-[var(--coral)] hover:text-[var(--coral)]"
              >
                {trimNumber(weight)}kg
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </FieldRow>

      <div className="flex items-end gap-2">
        <NumberStepper
          value={newWeight}
          onChange={setNewWeight}
          min={0.5}
          max={80}
          step={0.5}
          suffix="kg"
          label="Dumbbell to add"
          className="flex-1"
        />
        <Button
          variant="soft"
          size="md"
          onClick={() => {
            if (rack.includes(newWeight)) {
              toast.error("That one is already on the rack.");
              return;
            }
            setRack((r) => [...r, newWeight].sort((a, b) => a - b));
          }}
        >
          Add
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Machine step" hint="How much one pin moves.">
          <NumberStepper
            value={machine}
            onChange={setMachine}
            min={0.5}
            max={25}
            step={0.5}
            suffix="kg"
            label="Machine weight increment"
            size="sm"
          />
        </FieldRow>
        <FieldRow label="Barbell step" hint="Smallest plate pair.">
          <NumberStepper
            value={barbell}
            onChange={setBarbell}
            min={0.5}
            max={25}
            step={0.5}
            suffix="kg"
            label="Barbell weight increment"
            size="sm"
          />
        </FieldRow>
      </div>

      <p className="rounded-2xl bg-surface-2 p-3 text-xs leading-relaxed text-ink-soft">
        Any single machine that jumps differently can override this from the exercise itself, in
        Lift, Edit.
      </p>

      <Button variant="glitter" size="lg" block loading={pending} onClick={save}>
        Save
      </Button>
    </div>
  );
}
