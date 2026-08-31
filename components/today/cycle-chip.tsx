"use client";

import { useState, useTransition } from "react";
import { Droplet } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { logCycleDay } from "@/lib/actions/cycle";
import { PHASE_COPY, type CyclePhase } from "@/lib/domain/cycle";
import { cn } from "@/lib/utils";

const FLOWS = [
  { value: "none", label: "Nothing" },
  { value: "spotting", label: "Spotting" },
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "heavy", label: "Heavy" },
] as const;

const SYMPTOMS = ["Cramps", "Bloating", "Headache", "Low energy", "Cravings", "Sore", "Moody"];

export function CycleChip({
  phase,
  cycleDay,
  today,
  currentFlow,
  currentSymptoms,
}: {
  phase: CyclePhase;
  cycleDay: number | null;
  today: string;
  currentFlow: (typeof FLOWS)[number]["value"];
  currentSymptoms: string[];
}) {
  const [open, setOpen] = useState(false);
  const [flow, setFlow] = useState<(typeof FLOWS)[number]["value"]>(currentFlow);
  const [symptoms, setSymptoms] = useState<string[]>(currentSymptoms);
  const [pending, startTransition] = useTransition();

  const copy = PHASE_COPY[phase];

  function save() {
    startTransition(async () => {
      try {
        await logCycleDay({ date: today, flow, symptoms });
        setOpen(false);
        toast.success("Logged.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save that.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink-soft transition-colors duration-200 hover:border-line-strong hover:text-ink"
      >
        <Droplet
          className={cn("size-3.5", phase === "period" ? "text-[var(--coral)]" : "text-[var(--lilac-deep)]")}
          aria-hidden
        />
        {cycleDay ? `Day ${cycleDay} · ${copy.label}` : "Log cycle"}
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Cycle"
        description={cycleDay ? `Day ${cycleDay}. ${copy.note}` : copy.note}
      >
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-soft">Flow today</legend>
          <div className="flex flex-wrap gap-2">
            {FLOWS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFlow(option.value)}
                aria-pressed={flow === option.value}
                className={cn(
                  "min-h-11 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors duration-200",
                  flow === option.value
                    ? "border-transparent bg-[var(--coral)] text-white"
                    : "border-line bg-surface text-ink-soft hover:text-ink",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-semibold text-ink-soft">
            Anything else going on
          </legend>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((symptom) => {
              const active = symptoms.includes(symptom);
              return (
                <button
                  key={symptom}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setSymptoms((prev) =>
                      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom],
                    )
                  }
                  className={cn(
                    "min-h-11 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors duration-200",
                    active
                      ? "border-transparent bg-[var(--lilac-deep)] text-white"
                      : "border-line bg-surface text-ink-soft hover:text-ink",
                  )}
                >
                  {symptom}
                </button>
              );
            })}
          </div>
        </fieldset>

        <Button variant="glitter" size="lg" block className="mt-7" loading={pending} onClick={save}>
          Save
        </Button>
      </Sheet>
    </>
  );
}
