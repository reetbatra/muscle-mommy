"use client";

import { useState, useTransition } from "react";
import { Flame, Footprints, Moon, Pencil, Timer } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FieldRow, Input } from "@/components/ui/field";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Sparkle } from "@/components/ui/sparkle";
import { setHealthDay } from "@/lib/actions/health";
import { dayBurn } from "@/lib/domain/macros";

type Draft = {
  steps: string;
  activeKcal: string;
  basalKcal: string;
  exerciseMinutes: string;
  sleepHours: string;
  sleepMins: string;
};

/**
 * Steps, energy and sleep for the day, and the sheet that lets them be typed.
 *
 * The Apple Health Shortcut is the intended source, but it fails silently and
 * often. Every field it posts can be entered by hand from the Health app, so a
 * dead automation costs a minute rather than a day.
 */
export function MovementCard({
  date,
  steps,
  target,
  sleepMinutes,
  activeKcal,
  basalKcal,
  exerciseMinutes,
  lastRestingKcal,
  maintenanceKcal,
  consumedKcal,
}: {
  date: string;
  steps: number | null;
  target: number;
  sleepMinutes: number | null;
  activeKcal: number | null;
  basalKcal: number | null;
  exerciseMinutes: number | null;
  lastRestingKcal: number | null;
  maintenanceKcal: number;
  consumedKcal: number;
}) {
  const [open, setOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const [draft, setDraft] = useState<Draft>(() =>
    toDraft({ steps, activeKcal, basalKcal, exerciseMinutes, sleepMinutes, lastRestingKcal }),
  );

  const burn = dayBurn({ maintenanceKcal, activeKcal, basalKcal });
  const nothingLogged = steps === null && activeKcal === null && basalKcal === null;

  function openSheet() {
    setDraft(toDraft({ steps, activeKcal, basalKcal, exerciseMinutes, sleepMinutes, lastRestingKcal }));
    setOpen(true);
  }

  function set<K extends keyof Draft>(key: K, value: string) {
    setDraft((d) => ({ ...d, [key]: value.replace(/[^\d]/g, "") }));
  }

  // The sheet shows the deficit it is about to produce, so the gym session can
  // be seen landing on the number before the sheet is even closed.
  const previewBurn = dayBurn({
    maintenanceKcal,
    activeKcal: numOrNull(draft.activeKcal),
    basalKcal: numOrNull(draft.basalKcal),
  });
  const previewNet = consumedKcal - previewBurn.total;

  function save() {
    const sleep = sleepFromDraft(draft);
    startSaving(async () => {
      try {
        await setHealthDay({
          date,
          steps: numOrNull(draft.steps),
          activeKcal: numOrNull(draft.activeKcal),
          basalKcal: numOrNull(draft.basalKcal),
          exerciseMinutes: numOrNull(draft.exerciseMinutes),
          sleepMinutes: sleep,
        });
        setOpen(false);
        toast.success("Saved");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save that.");
      }
    });
  }

  return (
    <section className="card p-5" aria-labelledby="steps-heading">
      <div className="flex items-center gap-5">
        <ProgressRing
          value={steps ?? 0}
          max={target}
          size={88}
          thickness={9}
          color="var(--accent-soft)"
          label="Steps against target"
        >
          <Footprints className="size-4 text-[var(--accent-soft)]" aria-hidden />
          <span className="tnum font-display mt-0.5 text-lg leading-none font-bold text-ink">
            {steps === null ? "—" : steps.toLocaleString()}
          </span>
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 id="steps-heading" className="font-display text-lg font-semibold text-ink">
              Movement
            </h2>
            <button
              type="button"
              onClick={openSheet}
              aria-label="Edit steps and calories burned"
              className="-mt-1 -mr-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
            >
              <Pencil className="size-4" aria-hidden />
            </button>
          </div>

          {steps === null ? (
            <p className="mt-1 text-[15px] text-ink-soft">Nothing logged yet.</p>
          ) : (
            <p className="tnum mt-1 flex items-center gap-1.5 text-[15px] text-ink-soft">
              {steps >= target ? (
                <>
                  Goal met
                  <Sparkle size={12} twinkle />
                </>
              ) : (
                `${(target - steps).toLocaleString()} to go`
              )}
            </p>
          )}

          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            {activeKcal !== null ? (
              <div className="flex items-center gap-1.5">
                <dt className="text-ink-faint">Active</dt>
                <dd className="tnum font-bold text-ink">{activeKcal} kcal</dd>
              </div>
            ) : null}
            {exerciseMinutes ? (
              <div className="flex items-center gap-1.5">
                <Timer className="size-3 text-ink-faint" aria-hidden />
                <dt className="sr-only">Exercise</dt>
                <dd className="tnum font-bold text-ink">{exerciseMinutes} min</dd>
              </div>
            ) : null}
            {sleepMinutes !== null ? (
              <div className="flex items-center gap-1.5">
                <Moon className="size-3 text-ink-faint" aria-hidden />
                <dt className="sr-only">Sleep</dt>
                <dd className="tnum font-bold text-ink">
                  {Math.floor(sleepMinutes / 60)}h {sleepMinutes % 60}m
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="flex items-center gap-1.5 text-xs text-ink-faint">
          <Flame className="size-3.5" aria-hidden />
          {burn.source === "health" ? "Burned today" : "Estimated burn"}
        </span>
        <span className="tnum text-sm font-bold text-ink">
          {Math.round(burn.total)} kcal
          {burn.source === "health" ? (
            <span className="ml-1.5 font-medium text-ink-faint">
              {Math.round(burn.resting)} resting + {Math.round(burn.active)} active
            </span>
          ) : null}
        </span>
      </div>

      {nothingLogged ? (
        <Button variant="soft" size="md" block className="mt-3" onClick={openSheet}>
          Add today&rsquo;s numbers
        </Button>
      ) : null}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="From Apple Health"
        description="Open Health, read the numbers off, type them in. Leave anything you do not know blank."
      >
        <div className="space-y-4">
          <FieldRow label="Steps" htmlFor="mv-steps">
            <Input
              id="mv-steps"
              inputMode="numeric"
              placeholder="—"
              value={draft.steps}
              onChange={(e) => set("steps", e.target.value)}
            />
          </FieldRow>

          <FieldRow
            label="Active energy (kcal)"
            htmlFor="mv-active"
            hint="Health › Activity › Move. Everything you burned above lying still, gym included."
          >
            <Input
              id="mv-active"
              inputMode="numeric"
              placeholder="—"
              value={draft.activeKcal}
              onChange={(e) => set("activeKcal", e.target.value)}
            />
          </FieldRow>

          <FieldRow
            label="Resting energy (kcal)"
            htmlFor="mv-basal"
            hint="Health › Browse › Activity › Resting Energy. It barely changes day to day, so it prefills after the first time — and without it your active calories cannot be counted, because the maintenance estimate already includes normal walking about."
          >
            <Input
              id="mv-basal"
              inputMode="numeric"
              placeholder={String(maintenanceKcal)}
              value={draft.basalKcal}
              onChange={(e) => set("basalKcal", e.target.value)}
            />
          </FieldRow>

          <FieldRow label="Exercise minutes" htmlFor="mv-exercise">
            <Input
              id="mv-exercise"
              inputMode="numeric"
              placeholder="—"
              value={draft.exerciseMinutes}
              onChange={(e) => set("exerciseMinutes", e.target.value)}
            />
          </FieldRow>

          <FieldRow label="Sleep">
            <div className="flex items-center gap-2">
              <Input
                inputMode="numeric"
                aria-label="Sleep hours"
                placeholder="h"
                value={draft.sleepHours}
                onChange={(e) => set("sleepHours", e.target.value)}
              />
              <Input
                inputMode="numeric"
                aria-label="Sleep minutes"
                placeholder="m"
                value={draft.sleepMins}
                onChange={(e) => set("sleepMins", e.target.value)}
              />
            </div>
          </FieldRow>

          <div className="rounded-[2px] border border-line bg-surface-2 p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-ink-faint uppercase">
              With these numbers
            </p>
            <p className="tnum font-display mt-1.5 text-xl text-ink">
              {previewBurn.source === "estimate"
                ? `About ${Math.round(previewBurn.total)} kcal burned`
                : `${Math.round(previewBurn.total)} kcal burned`}
            </p>
            <p className="tnum mt-1 text-sm text-ink-soft">
              {consumedKcal <= 0
                ? "Nothing eaten logged yet today."
                : previewNet <= 0
                  ? `Ate ${Math.round(consumedKcal)} — a ${Math.abs(Math.round(previewNet))} kcal deficit.`
                  : `Ate ${Math.round(consumedKcal)} — a ${Math.round(previewNet)} kcal surplus.`}
            </p>
            {previewBurn.source === "estimate" ? (
              <p className="mt-2 text-xs text-ink-faint">
                Estimated from your maintenance figure. Add resting energy for the measured number.
              </p>
            ) : null}
          </div>

          <Button block size="lg" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </Sheet>
    </section>
  );
}

function toDraft(input: {
  steps: number | null;
  activeKcal: number | null;
  basalKcal: number | null;
  exerciseMinutes: number | null;
  sleepMinutes: number | null;
  lastRestingKcal: number | null;
}): Draft {
  return {
    steps: input.steps === null ? "" : String(input.steps),
    activeKcal: input.activeKcal === null ? "" : String(input.activeKcal),
    // Resting energy carries over from the last day that had one, because
    // typing the same 1340 every morning is how a habit dies.
    basalKcal: String(input.basalKcal ?? input.lastRestingKcal ?? ""),
    exerciseMinutes: input.exerciseMinutes === null ? "" : String(input.exerciseMinutes),
    sleepHours: input.sleepMinutes === null ? "" : String(Math.floor(input.sleepMinutes / 60)),
    sleepMins: input.sleepMinutes === null ? "" : String(input.sleepMinutes % 60),
  };
}

function numOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function sleepFromDraft(draft: Draft): number | null {
  const hours = numOrNull(draft.sleepHours);
  const mins = numOrNull(draft.sleepMins);
  if (hours === null && mins === null) return null;
  return Math.min((hours ?? 0) * 60 + (mins ?? 0), 1440);
}
