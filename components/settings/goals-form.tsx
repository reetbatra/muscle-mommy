"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldRow, NumberStepper } from "@/components/ui/field";
import { updateGoals } from "@/lib/actions/settings";
import type { Goals } from "@/lib/domain/types";

export function GoalsForm({ goals }: { goals: Goals }) {
  const [values, setValues] = useState({
    calorie_target: goals.calorie_target,
    maintenance_kcal: goals.maintenance_kcal,
    protein_g: goals.protein_g,
    carbs_g: goals.carbs_g,
    fat_g: goals.fat_g,
    fiber_g: goals.fiber_g,
    step_target: goals.step_target,
    pages_target: goals.pages_target,
    weight_goal_kg: goals.weight_goal_kg ? Number(goals.weight_goal_kg) : 0,
  });
  const [pending, startTransition] = useTransition();

  const set = (key: keyof typeof values) => (next: number) =>
    setValues((v) => ({ ...v, [key]: next }));

  const deficit = values.maintenance_kcal - values.calorie_target;

  function save() {
    startTransition(async () => {
      try {
        await updateGoals({
          ...values,
          weight_goal_kg: values.weight_goal_kg > 0 ? values.weight_goal_kg : null,
        });
        toast.success("Targets updated.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save that.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <FieldRow
        label="Maintenance"
        hint="What you burn on a normal day. Apple Health overrides this once resting energy is syncing."
      >
        <NumberStepper
          value={values.maintenance_kcal}
          onChange={set("maintenance_kcal")}
          min={800}
          max={6000}
          step={25}
          suffix="kcal"
          label="Maintenance calories"
        />
      </FieldRow>

      <FieldRow
        label="Daily calories"
        hint={
          deficit > 0
            ? `A ${deficit} kcal deficit, which is about ${(deficit / 1100).toFixed(1)}kg of fat a week.`
            : "This is at or above maintenance, so you are not in a deficit."
        }
      >
        <NumberStepper
          value={values.calorie_target}
          onChange={set("calorie_target")}
          min={800}
          max={6000}
          step={25}
          suffix="kcal"
          label="Daily calorie target"
        />
      </FieldRow>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Protein">
          <NumberStepper
            value={values.protein_g}
            onChange={set("protein_g")}
            min={20}
            max={400}
            step={5}
            suffix="g"
            label="Protein target"
            size="sm"
          />
        </FieldRow>
        <FieldRow label="Fibre">
          <NumberStepper
            value={values.fiber_g}
            onChange={set("fiber_g")}
            min={5}
            max={120}
            step={1}
            suffix="g"
            label="Fibre target"
            size="sm"
          />
        </FieldRow>
        <FieldRow label="Carbs">
          <NumberStepper
            value={values.carbs_g}
            onChange={set("carbs_g")}
            min={0}
            max={800}
            step={5}
            suffix="g"
            label="Carb target"
            size="sm"
          />
        </FieldRow>
        <FieldRow label="Fat">
          <NumberStepper
            value={values.fat_g}
            onChange={set("fat_g")}
            min={10}
            max={300}
            step={1}
            suffix="g"
            label="Fat target"
            size="sm"
          />
        </FieldRow>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Steps">
          <NumberStepper
            value={values.step_target}
            onChange={set("step_target")}
            min={1000}
            max={40000}
            step={500}
            label="Step target"
            size="sm"
          />
        </FieldRow>
        <FieldRow label="Pages a day">
          <NumberStepper
            value={values.pages_target}
            onChange={set("pages_target")}
            min={1}
            max={500}
            step={1}
            label="Pages target"
            size="sm"
          />
        </FieldRow>
      </div>

      <FieldRow label="Goal weight" hint="Set to zero to leave it off the chart.">
        <NumberStepper
          value={values.weight_goal_kg}
          onChange={set("weight_goal_kg")}
          min={0}
          max={250}
          step={0.5}
          suffix="kg"
          label="Goal weight"
        />
      </FieldRow>

      <Button variant="glitter" size="lg" block loading={pending} onClick={save}>
        Save targets
      </Button>
    </div>
  );
}
