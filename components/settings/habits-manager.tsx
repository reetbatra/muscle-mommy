"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldRow, Input, NumberStepper, Select } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { archiveHabit, createHabit, updateHabit } from "@/lib/actions/habits";
import { HABIT_CATEGORIES, HABIT_ICON_NAMES, habitIcon } from "@/lib/domain/habits";
import type { Habit } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type Draft = {
  label: string;
  hint: string;
  icon: string;
  category: "fuel" | "wellness" | "mind";
  target_per_day: number;
};

const EMPTY: Draft = { label: "", hint: "", icon: "sparkles", category: "wellness", target_per_day: 1 };

export function HabitsManager({ habits }: { habits: Habit[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Habit | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-[var(--border)]">
        {habits.map((habit) => {
          const Icon = habitIcon(habit.icon);
          return (
            <li key={habit.id} className="flex items-center gap-3 py-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-[var(--accent)]">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{habit.label}</span>
                <span className="block truncate text-xs text-ink-faint">
                  {habit.target_per_day > 1 ? `${habit.target_per_day} times a day · ` : ""}
                  {HABIT_CATEGORIES.find((c) => c.key === habit.category)?.label}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setEditing(habit)}
                aria-label={`Edit ${habit.label}`}
                className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-faint transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
              >
                <Pencil className="size-4" aria-hidden />
              </button>
              <ArchiveButton habit={habit} onDone={() => router.refresh()} />
            </li>
          );
        })}
      </ul>

      <Button variant="soft" size="md" block onClick={() => setCreating(true)}>
        <Plus className="size-4" aria-hidden />
        Add a habit
      </Button>

      <HabitSheet
        open={creating}
        onClose={() => setCreating(false)}
        title="Add a habit"
        initial={EMPTY}
        onSubmit={async (draft) => {
          await createHabit({ ...draft, hint: draft.hint.trim() || null });
          setCreating(false);
          router.refresh();
        }}
      />

      <HabitSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit habit"
        initial={
          editing
            ? {
                label: editing.label,
                hint: editing.hint ?? "",
                icon: editing.icon,
                category: editing.category,
                target_per_day: editing.target_per_day,
              }
            : EMPTY
        }
        onSubmit={async (draft) => {
          if (!editing) return;
          await updateHabit(editing.id, { ...draft, hint: draft.hint.trim() || null });
          setEditing(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function ArchiveButton({ habit, onDone }: { habit: Habit; onDone: () => void }) {
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
            await archiveHabit(habit.id);
            onDone();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not remove it.");
          }
        });
      }}
      aria-label={confirming ? `Confirm removing ${habit.label}` : `Remove ${habit.label}`}
      className={cn(
        "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-150",
        confirming
          ? "bg-[var(--bad)] text-white"
          : "text-ink-faint hover:bg-surface-2 hover:text-[var(--bad)]",
      )}
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}

function HabitSheet({
  open,
  onClose,
  title,
  initial,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  initial: Draft;
  onSubmit: (draft: Draft) => Promise<void>;
}) {
  const [draft, setDraft] = useState(initial);
  const [seed, setSeed] = useState(initial.label);
  const [pending, startTransition] = useTransition();

  if (seed !== initial.label) {
    setSeed(initial.label);
    setDraft(initial);
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <FieldRow label="What is it?" htmlFor="habit-label">
          <Input
            id="habit-label"
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            placeholder="Stretch before bed"
          />
        </FieldRow>

        <FieldRow label="A nudge for future you" htmlFor="habit-hint">
          <Input
            id="habit-hint"
            value={draft.hint}
            onChange={(e) => setDraft((d) => ({ ...d, hint: e.target.value }))}
            placeholder="Five minutes is enough"
          />
        </FieldRow>

        <FieldRow label="Group" htmlFor="habit-category">
          <Select
            id="habit-category"
            value={draft.category}
            onChange={(e) =>
              setDraft((d) => ({ ...d, category: e.target.value as Draft["category"] }))
            }
          >
            {HABIT_CATEGORIES.map((category) => (
              <option key={category.key} value={category.key}>
                {category.label} · {category.blurb}
              </option>
            ))}
          </Select>
        </FieldRow>

        <FieldRow label="How many times a day?">
          <NumberStepper
            value={draft.target_per_day}
            onChange={(next) => setDraft((d) => ({ ...d, target_per_day: next }))}
            min={1}
            max={12}
            step={1}
            label="Times per day"
          />
        </FieldRow>

        <FieldRow label="Icon">
          <div className="flex flex-wrap gap-2">
            {HABIT_ICON_NAMES.map((name) => {
              const Icon = habitIcon(name);
              const active = draft.icon === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, icon: name }))}
                  aria-label={name}
                  aria-pressed={active}
                  className={cn(
                    "flex size-11 cursor-pointer items-center justify-center rounded-xl border transition-colors duration-150",
                    active
                      ? "border-transparent bg-[var(--accent)] text-white"
                      : "border-line bg-surface text-ink-soft hover:text-ink",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </button>
              );
            })}
          </div>
        </FieldRow>

        <Button
          variant="glitter"
          size="lg"
          block
          loading={pending}
          onClick={() => {
            if (!draft.label.trim()) {
              toast.error("Give it a name.");
              return;
            }
            startTransition(async () => {
              try {
                await onSubmit(draft);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not save that.");
              }
            });
          }}
        >
          Save
        </Button>
      </div>
    </Sheet>
  );
}
