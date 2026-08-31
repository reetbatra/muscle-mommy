"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldRow, Input, NumberStepper, Select, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import {
  addRoutineExercise,
  removeRoutineExercise,
  reorderRoutineExercises,
  updateRoutineDay,
  updateRoutineExercise,
} from "@/lib/actions/settings";
import type { RoutineDayFull, RoutineExerciseFull } from "@/lib/data";
import type { Exercise } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const LOAD_TYPES = [
  { value: "machine", label: "Machine or cable stack" },
  { value: "dumbbell_pair", label: "Dumbbells, one in each hand" },
  { value: "dumbbell_single", label: "Dumbbell, one arm at a time" },
  { value: "barbell", label: "Barbell" },
  { value: "bodyweight", label: "Bodyweight" },
  { value: "banded", label: "Band assisted" },
] as const;

export function SplitEditor({
  days,
  library,
}: {
  days: RoutineDayFull[];
  library: Exercise[];
}) {
  const [openDay, setOpenDay] = useState<string | null>(days[0]?.id ?? null);

  return (
    <div className="space-y-3">
      {days.map((day) => (
        <DayCard
          key={day.id}
          day={day}
          library={library}
          open={openDay === day.id}
          onToggle={() => setOpenDay((current) => (current === day.id ? null : day.id))}
        />
      ))}
    </div>
  );
}

function DayCard({
  day,
  library,
  open,
  onToggle,
}: {
  day: RoutineDayFull;
  library: Exercise[];
  open: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [editingDay, setEditingDay] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<RoutineExerciseFull | null>(null);
  const [, startTransition] = useTransition();

  function move(index: number, direction: -1 | 1) {
    const ordered = [...day.routine_exercises];
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

    startTransition(async () => {
      try {
        await reorderRoutineExercises(day.id, ordered.map((e) => e.id));
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not reorder.");
      }
    });
  }

  return (
    <section className="card overflow-hidden p-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 p-4 text-left transition-colors duration-150 hover:bg-surface-2"
      >
        <span className="tnum flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-sm font-bold text-[var(--pink-deep)]">
          {day.day_index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-display block truncate text-base font-semibold text-ink">
            {day.name}
          </span>
          <span className="block truncate text-sm text-ink-soft">
            {day.routine_exercises.length}{" "}
            {day.routine_exercises.length === 1 ? "exercise" : "exercises"}
            {day.rest_after ? " · rest after" : ""}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-ink-faint transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="border-t border-line p-4">
          <Button variant="soft" size="sm" onClick={() => setEditingDay(true)}>
            <Pencil className="size-3.5" aria-hidden />
            Rename this day
          </Button>

          <ul className="mt-4 divide-y divide-[var(--border)]">
            {day.routine_exercises.map((item, index) => (
              <li key={item.id} className="flex items-center gap-2 py-2.5">
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${item.exercise.name} up`}
                    className="flex size-6 cursor-pointer items-center justify-center rounded text-ink-faint transition-colors duration-150 hover:text-ink disabled:opacity-30"
                  >
                    <ChevronUp className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === day.routine_exercises.length - 1}
                    aria-label={`Move ${item.exercise.name} down`}
                    className="flex size-6 cursor-pointer items-center justify-center rounded text-ink-faint transition-colors duration-150 hover:text-ink disabled:opacity-30"
                  >
                    <ChevronDown className="size-4" aria-hidden />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {item.display_name ?? item.exercise.name}
                  </p>
                  <p className="tnum truncate text-xs text-ink-faint">
                    {item.target_sets} × {item.rep_low}-{item.rep_high} ·{" "}
                    {LOAD_TYPES.find((t) => t.value === item.load_type)?.label}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditing(item)}
                  aria-label={`Edit ${item.exercise.name}`}
                  className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-faint transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
                <RemoveButton id={item.id} name={item.exercise.name} />
              </li>
            ))}
          </ul>

          <Button variant="soft" size="md" block className="mt-3" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden />
            Add an exercise
          </Button>
        </div>
      ) : null}

      <DaySheet day={day} open={editingDay} onClose={() => setEditingDay(false)} />
      <AddExerciseSheet
        dayId={day.id}
        library={library}
        alreadyIn={new Set(day.routine_exercises.map((e) => e.exercise_id))}
        open={adding}
        onClose={() => setAdding(false)}
      />
      <ExerciseSheet item={editing} open={editing !== null} onClose={() => setEditing(null)} />
    </section>
  );
}

function RemoveButton({ id, name }: { id: string; name: string }) {
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
            await removeRoutineExercise(id);
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not remove it.");
          }
        });
      }}
      aria-label={confirming ? `Confirm removing ${name}` : `Remove ${name}`}
      className={cn(
        "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-150",
        confirming
          ? "bg-[var(--coral)] text-white"
          : "text-ink-faint hover:bg-surface-2 hover:text-[var(--coral)]",
      )}
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}

function DaySheet({
  day,
  open,
  onClose,
}: {
  day: RoutineDayFull;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(day.name);
  const [subtitle, setSubtitle] = useState(day.subtitle ?? "");
  const [restAfter, setRestAfter] = useState(day.rest_after);
  const [pending, startTransition] = useTransition();

  return (
    <Sheet open={open} onClose={onClose} title="Rename this day">
      <div className="space-y-4">
        <FieldRow label="Name" htmlFor={`day-name-${day.id}`}>
          <Input
            id={`day-name-${day.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FieldRow>
        <FieldRow label="Subtitle" htmlFor={`day-sub-${day.id}`}>
          <Input
            id={`day-sub-${day.id}`}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Push and pull, heavier"
          />
        </FieldRow>

        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface px-4">
          <input
            type="checkbox"
            checked={restAfter}
            onChange={(e) => setRestAfter(e.target.checked)}
            className="size-5 accent-[var(--pink-deep)]"
          />
          <span className="text-sm font-semibold text-ink">Rest day after this one</span>
        </label>

        <Button
          variant="glitter"
          size="lg"
          block
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                await updateRoutineDay(day.id, {
                  name: name.trim(),
                  subtitle: subtitle.trim() || null,
                  rest_after: restAfter,
                });
                onClose();
                router.refresh();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not save that.");
              }
            })
          }
        >
          Save
        </Button>
      </div>
    </Sheet>
  );
}

function AddExerciseSheet({
  dayId,
  library,
  alreadyIn,
  open,
  onClose,
}: {
  dayId: string;
  library: Exercise[];
  alreadyIn: Set<string>;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = library.filter(
      (exercise) =>
        !needle ||
        exercise.name.toLowerCase().includes(needle) ||
        exercise.muscle_group.toLowerCase().includes(needle),
    );
    const byGroup = new Map<string, Exercise[]>();
    for (const exercise of matches) {
      const list = byGroup.get(exercise.muscle_group) ?? [];
      list.push(exercise);
      byGroup.set(exercise.muscle_group, list);
    }
    return [...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [library, query]);

  return (
    <Sheet open={open} onClose={onClose} title="Add an exercise">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-faint"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or muscle"
          className="pl-11"
          aria-label="Search the exercise library"
        />
      </div>

      <div className="mt-4 space-y-4">
        {grouped.map(([group, exercises]) => (
          <div key={group}>
            <h3 className="mb-1.5 text-xs font-bold tracking-[0.14em] text-ink-faint uppercase">
              {group}
            </h3>
            <ul className="space-y-1">
              {exercises.map((exercise) => (
                <li key={exercise.id}>
                  <button
                    type="button"
                    disabled={pending || alreadyIn.has(exercise.id)}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await addRoutineExercise(dayId, exercise.id);
                          onClose();
                          router.refresh();
                        } catch (error) {
                          toast.error(
                            error instanceof Error ? error.message : "Could not add that.",
                          );
                        }
                      })
                    }
                    className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-3 text-left transition-colors duration-150 hover:bg-surface-2 disabled:cursor-default disabled:opacity-40"
                  >
                    <span className="truncate text-sm font-semibold text-ink">{exercise.name}</span>
                    <span className="shrink-0 text-xs text-ink-faint">
                      {alreadyIn.has(exercise.id) ? "Already in" : exercise.equipment}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {grouped.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">Nothing matches that.</p>
        ) : null}
      </div>
    </Sheet>
  );
}

function ExerciseSheet({
  item,
  open,
  onClose,
}: {
  item: RoutineExerciseFull | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => toDraft(item));
  const [seed, setSeed] = useState(item?.id ?? "");
  const [pending, startTransition] = useTransition();

  if (seed !== (item?.id ?? "")) {
    setSeed(item?.id ?? "");
    setDraft(toDraft(item));
  }
  if (!item) return null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item.exercise.name}
      description="These settings decide what the app tells you to do next time."
    >
      <div className="space-y-4">
        <FieldRow
          label="Call it something else"
          hint="Only changes what you see. History stays attached to the same exercise."
        >
          <Input
            value={draft.display_name}
            onChange={(e) => setDraft((d) => ({ ...d, display_name: e.target.value }))}
            placeholder={item.exercise.name}
          />
        </FieldRow>

        <FieldRow label="How is it loaded?" hint="This decides what the next weight up actually is.">
          <Select
            value={draft.load_type}
            onChange={(e) =>
              setDraft((d) => ({ ...d, load_type: e.target.value as typeof d.load_type }))
            }
          >
            {LOAD_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </FieldRow>

        <div className="grid grid-cols-3 gap-2">
          <FieldRow label="Sets">
            <NumberStepper
              value={draft.target_sets}
              onChange={(next) => setDraft((d) => ({ ...d, target_sets: next }))}
              min={1}
              max={12}
              label="Target sets"
              size="sm"
            />
          </FieldRow>
          <FieldRow label="Min reps">
            <NumberStepper
              value={draft.rep_low}
              onChange={(next) => setDraft((d) => ({ ...d, rep_low: next }))}
              min={1}
              max={50}
              label="Bottom of the rep range"
              size="sm"
            />
          </FieldRow>
          <FieldRow label="Ceiling">
            <NumberStepper
              value={draft.rep_high}
              onChange={(next) => setDraft((d) => ({ ...d, rep_high: next }))}
              min={1}
              max={60}
              label="Rep ceiling that unlocks the next weight"
              size="sm"
            />
          </FieldRow>
        </div>

        <p className="rounded-2xl bg-surface-2 p-3 text-xs leading-relaxed text-ink-soft">
          Every set reaching {draft.rep_high} reps is what moves the weight up. Until then the app
          asks for one more rep at a time.
        </p>

        <FieldRow
          label="Hard rep cap"
          hint="Only used when the next weight is nearly a doubling. Reps climb to here first."
        >
          <NumberStepper
            value={draft.rep_ceiling_max}
            onChange={(next) => setDraft((d) => ({ ...d, rep_ceiling_max: next }))}
            min={draft.rep_high}
            max={60}
            label="Hard rep cap"
          />
        </FieldRow>

        <FieldRow
          label="Weight step for this machine"
          hint="Zero means use the default from your gym settings."
        >
          <NumberStepper
            value={draft.increment_kg}
            onChange={(next) => setDraft((d) => ({ ...d, increment_kg: next }))}
            min={0}
            max={25}
            step={0.5}
            suffix="kg"
            label="Weight increment override"
          />
        </FieldRow>

        <FieldRow label="Rest between sets">
          <NumberStepper
            value={draft.rest_seconds}
            onChange={(next) => setDraft((d) => ({ ...d, rest_seconds: next }))}
            min={0}
            max={600}
            step={15}
            suffix="sec"
            label="Rest in seconds"
          />
        </FieldRow>

        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface px-4">
          <input
            type="checkbox"
            checked={draft.to_failure}
            onChange={(e) => setDraft((d) => ({ ...d, to_failure: e.target.checked }))}
            className="size-5 accent-[var(--pink-deep)]"
          />
          <span className="text-sm font-semibold text-ink">Take the last set to failure</span>
        </label>

        <FieldRow label="Note to yourself">
          <Textarea
            rows={2}
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            placeholder="Hands off the knees"
            aria-label="Exercise note"
          />
        </FieldRow>

        <Button
          variant="glitter"
          size="lg"
          block
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                await updateRoutineExercise(item.id, {
                  target_sets: draft.target_sets,
                  rep_low: draft.rep_low,
                  rep_high: draft.rep_high,
                  rep_ceiling_max: Math.max(draft.rep_ceiling_max, draft.rep_high),
                  rest_seconds: draft.rest_seconds,
                  load_type: draft.load_type,
                  increment_kg: draft.increment_kg > 0 ? draft.increment_kg : null,
                  display_name: draft.display_name.trim() || null,
                  notes: draft.notes.trim() || null,
                  to_failure: draft.to_failure,
                });
                onClose();
                router.refresh();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not save that.");
              }
            })
          }
        >
          Save
        </Button>
      </div>
    </Sheet>
  );
}

function toDraft(item: RoutineExerciseFull | null) {
  return {
    display_name: item?.display_name ?? "",
    load_type: item?.load_type ?? ("machine" as RoutineExerciseFull["load_type"]),
    target_sets: item?.target_sets ?? 3,
    rep_low: item?.rep_low ?? 8,
    rep_high: item?.rep_high ?? 12,
    rep_ceiling_max: item?.rep_ceiling_max ?? 20,
    rest_seconds: item?.rest_seconds ?? 90,
    increment_kg: item?.increment_kg ? Number(item.increment_kg) : 0,
    notes: item?.notes ?? "",
    to_failure: item?.to_failure ?? true,
  };
}
