"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Flag, Plus, Timer, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NumberStepper, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { PrescriptionBadge } from "./prescription-badge";
import { deleteSet, discardSession, finishSession, saveSet } from "@/lib/actions/workout";
import { celebrate, sparkleAt } from "@/lib/celebrate";
import { isWeightless, type LoadType, type Prescription } from "@/lib/domain/overload";
import { cn } from "@/lib/utils";

export type LoggedRow = { set_index: number; weight_kg: number; reps: number };

export type ExerciseBlock = {
  routineExerciseId: string;
  exerciseId: string;
  name: string;
  notes: string | null;
  restSeconds: number;
  loadType: LoadType;
  prescription: Prescription;
  loggedSets: LoggedRow[];
};

const FEELINGS = [
  { value: 1, label: "Rough" },
  { value: 2, label: "Heavy" },
  { value: 3, label: "Fine" },
  { value: 4, label: "Strong" },
  { value: 5, label: "Unreal" },
];

export function SessionLogger({
  sessionId,
  title,
  blocks,
}: {
  sessionId: string;
  title: string;
  blocks: ExerciseBlock[];
}) {
  const router = useRouter();
  const [finishing, setFinishing] = useState(false);
  const [feel, setFeel] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [rest, setRest] = useState<{ endsAt: number; label: string } | null>(null);

  const totalTargets = blocks.reduce((n, b) => n + b.prescription.targets.length, 0);
  const totalLogged = blocks.reduce((n, b) => n + b.loggedSets.length, 0);

  function onSetLogged(block: ExerciseBlock) {
    if (block.restSeconds > 0) {
      setRest({ endsAt: Date.now() + block.restSeconds * 1000, label: block.name });
    }
  }

  function onFinish() {
    startTransition(async () => {
      try {
        const result = await finishSession({ sessionId, feel, notes: notes.trim() || null });
        celebrate();
        toast.success(
          result.estimatedKcal
            ? `Session done. About ${result.estimatedKcal} kcal over ${result.minutes} minutes.`
            : "Session done.",
        );
        setFinishing(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not finish the session.");
      }
    });
  }

  return (
    <>
      <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-line bg-bg/85 px-4 pt-safe backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <h1 className="font-display truncate text-lg font-semibold text-ink">{title}</h1>
            <p className="tnum text-xs text-ink-faint">
              {totalLogged} of {totalTargets} sets logged
            </p>
          </div>
          <Button variant="soft" size="sm" onClick={() => setFinishing(true)}>
            <Flag className="size-3.5" aria-hidden />
            Finish
          </Button>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="glitter-fill h-full rounded-full transition-[width] duration-500"
            style={{ width: `${totalTargets ? (totalLogged / totalTargets) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {blocks.map((block) => (
          <ExerciseCard
            key={block.routineExerciseId}
            sessionId={sessionId}
            block={block}
            onSetLogged={() => onSetLogged(block)}
          />
        ))}
      </div>

      {rest ? <RestTimer key={rest.endsAt} rest={rest} onDone={() => setRest(null)} /> : null}

      <Sheet
        open={finishing}
        onClose={() => setFinishing(false)}
        title="Finish this session"
        description="How did it feel? This is only for your own record."
      >
        <div className="flex flex-wrap gap-2">
          {FEELINGS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFeel(feel === option.value ? null : option.value)}
              aria-pressed={feel === option.value}
              className={cn(
                "min-h-11 flex-1 cursor-pointer rounded-full border px-3 text-sm font-semibold transition-colors duration-200",
                feel === option.value
                  ? "border-transparent bg-[var(--accent)] text-white"
                  : "border-line bg-surface text-ink-soft hover:text-ink",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <Textarea
          className="mt-4"
          rows={3}
          placeholder="Anything worth remembering next time"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          aria-label="Session notes"
        />

        <Button variant="glitter" size="lg" block className="mt-5" loading={pending} onClick={onFinish}>
          Save and finish
        </Button>

        <Button
          variant="ghost"
          size="sm"
          block
          className="mt-2 text-[var(--bad)]"
          onClick={() => {
            if (totalLogged > 0) {
              toast.error("There are logged sets here. Delete them first if you really want this gone.");
              return;
            }
            startTransition(async () => {
              try {
                await discardSession(sessionId);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not discard it.");
              }
            });
          }}
        >
          <X className="size-3.5" aria-hidden />
          Discard this session
        </Button>
      </Sheet>
    </>
  );
}

function ExerciseCard({
  sessionId,
  block,
  onSetLogged,
}: {
  sessionId: string;
  block: ExerciseBlock;
  onSetLogged: () => void;
}) {
  const weightless = isWeightless(block.loadType);
  const [extraSets, setExtraSets] = useState(0);
  const [logged, setLogged] = useState<Map<number, LoggedRow>>(
    () => new Map(block.loggedSets.map((s) => [s.set_index, s])),
  );

  const rows = useMemo(() => {
    const base = block.prescription.targets.map((t) => ({
      setIndex: t.setIndex,
      targetReps: t.reps,
      targetWeight: t.weightKg,
      toFailure: t.toFailure,
    }));
    const last = base.at(-1);
    const extras = Array.from({ length: extraSets }, (_, i) => ({
      setIndex: base.length + i + 1,
      targetReps: last?.targetReps ?? block.prescription.ceiling,
      targetWeight: last?.targetWeight ?? null,
      toFailure: true,
    }));
    // Anything logged beyond the plan still has to show up.
    const loggedExtras = [...logged.keys()]
      .filter((index) => index > base.length + extras.length)
      .sort((a, b) => a - b)
      .map((setIndex) => ({
        setIndex,
        targetReps: last?.targetReps ?? block.prescription.ceiling,
        targetWeight: last?.targetWeight ?? null,
        toFailure: true,
      }));
    return [...base, ...extras, ...loggedExtras];
  }, [block.prescription, extraSets, logged]);

  const doneCount = rows.filter((r) => logged.has(r.setIndex)).length;
  const complete = doneCount >= block.prescription.targets.length;

  return (
    <section
      className={cn("card p-4 transition-colors duration-300", complete && "border-[var(--good)]")}
      aria-labelledby={`exercise-${block.routineExerciseId}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id={`exercise-${block.routineExerciseId}`}
            className="font-display text-base leading-tight font-semibold text-ink"
          >
            {block.name}
          </h2>
          <p className="mt-0.5 text-sm font-medium text-ink-soft">{block.prescription.headline}</p>
        </div>
        <PrescriptionBadge status={block.prescription.status} />
      </div>

      {block.prescription.previousLabel ? (
        <p className="tnum mt-2 text-xs text-ink-faint">
          Last time: {block.prescription.previousLabel}
        </p>
      ) : null}

      <p className="mt-2 text-xs leading-relaxed text-ink-soft">{block.prescription.detail}</p>

      <ol className="mt-4 space-y-2">
        {rows.map((row) => (
          <SetRow
            key={row.setIndex}
            sessionId={sessionId}
            exerciseId={block.exerciseId}
            setIndex={row.setIndex}
            targetReps={row.targetReps}
            targetWeight={row.targetWeight}
            toFailure={row.toFailure}
            weightless={weightless}
            loadType={block.loadType}
            existing={logged.get(row.setIndex) ?? null}
            onSaved={(value) => {
              setLogged((prev) => new Map(prev).set(row.setIndex, value));
              onSetLogged();
            }}
            onCleared={() => {
              setLogged((prev) => {
                const next = new Map(prev);
                next.delete(row.setIndex);
                return next;
              });
            }}
          />
        ))}
      </ol>

      <button
        type="button"
        onClick={() => setExtraSets((n) => n + 1)}
        className="mt-3 flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[2px] border border-dashed border-line-strong text-sm font-semibold text-ink-soft transition-colors duration-200 hover:bg-surface-2 hover:text-ink"
      >
        <Plus className="size-4" aria-hidden />
        Add a set
      </button>

      {block.notes ? (
        <p className="mt-3 rounded-[2px] bg-surface-2 px-3 py-2 text-xs text-ink-soft">{block.notes}</p>
      ) : null}
    </section>
  );
}

function SetRow({
  sessionId,
  exerciseId,
  setIndex,
  targetReps,
  targetWeight,
  toFailure,
  weightless,
  loadType,
  existing,
  onSaved,
  onCleared,
}: {
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  targetReps: number;
  targetWeight: number | null;
  toFailure: boolean;
  weightless: boolean;
  loadType: LoadType;
  existing: LoggedRow | null;
  onSaved: (row: LoggedRow) => void;
  onCleared: () => void;
}) {
  const [weight, setWeight] = useState(existing?.weight_kg ?? targetWeight ?? 0);
  const [reps, setReps] = useState(existing?.reps ?? targetReps);
  const [pending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const done = existing !== null;

  function save() {
    if (reps <= 0) {
      toast.error("A set needs at least one rep.");
      return;
    }
    sparkleAt(buttonRef.current);
    startTransition(async () => {
      try {
        await saveSet({
          sessionId,
          exerciseId,
          setIndex,
          weightKg: weightless ? 0 : weight,
          reps,
          isWarmup: false,
          rpe: null,
        });
        onSaved({ set_index: setIndex, weight_kg: weightless ? 0 : weight, reps });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not log that set.");
      }
    });
  }

  function clear() {
    startTransition(async () => {
      try {
        await deleteSet(sessionId, exerciseId, setIndex);
        onCleared();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not remove that set.");
      }
    });
  }

  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-[2px] border p-2 transition-colors duration-200",
        done ? "border-[var(--good)] bg-surface-2" : "border-line bg-surface",
      )}
    >
      <span className="tnum flex size-8 shrink-0 items-center justify-center rounded-[2px] bg-surface-2 text-xs font-bold text-ink-faint">
        {setIndex}
      </span>

      {weightless ? (
        <span className="flex-1 text-xs font-semibold text-ink-faint">Bodyweight</span>
      ) : (
        <NumberStepper
          value={weight}
          onChange={setWeight}
          step={weight < 10 ? 0.5 : 2.5}
          min={0}
          max={700}
          size="sm"
          suffix={loadType === "dumbbell_pair" ? "kg ea" : "kg"}
          label={`Set ${setIndex} weight`}
          className="min-w-0 flex-1"
        />
      )}

      <NumberStepper
        value={reps}
        onChange={setReps}
        step={1}
        min={0}
        max={200}
        size="sm"
        suffix="reps"
        label={`Set ${setIndex} reps`}
        className="min-w-0 flex-1"
      />

      {done ? (
        <button
          type="button"
          onClick={clear}
          disabled={pending}
          aria-label={`Clear set ${setIndex}`}
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-faint transition-colors duration-150 hover:bg-surface-3 hover:text-[var(--bad)]"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={save}
          disabled={pending}
          aria-label={`Log set ${setIndex}${toFailure ? ", go to failure" : ""}`}
          className="glitter-fill flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-transform duration-150 active:scale-90 disabled:opacity-50"
        >
          <Check className="size-5" aria-hidden />
        </button>
      )}
    </li>
  );
}

function RestTimer({
  rest,
  onDone,
}: {
  rest: { endsAt: number; label: string };
  onDone: () => void;
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil((rest.endsAt - Date.now()) / 1000)),
  );

  // onDone is an inline arrow, so depending on it would tear down and rebuild
  // the interval on every parent render.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((rest.endsAt - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) {
        window.clearInterval(id);
        window.setTimeout(() => onDoneRef.current(), 1500);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [rest.endsAt]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-28 z-40 mx-auto flex max-w-lg items-center gap-3 rounded-[2px] border border-line bg-surface/95 px-4 py-3 shadow-[var(--shadow-lift)] backdrop-blur-xl"
    >
      <Timer className="size-4 shrink-0 text-[var(--accent)]" aria-hidden />
      <p className="min-w-0 flex-1 text-sm font-semibold text-ink">
        {remaining > 0 ? `Rest ${formatSeconds(remaining)}` : "Go again"}
      </p>
      <button
        type="button"
        onClick={onDone}
        className="cursor-pointer text-xs font-bold text-ink-faint transition-colors duration-150 hover:text-ink"
      >
        Skip
      </button>
    </div>
  );
}

function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, "0")}` : `${seconds}s`;
}
