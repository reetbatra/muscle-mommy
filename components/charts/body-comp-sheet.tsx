"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldRow, Input, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { saveBodyComp } from "@/lib/actions/settings";
import type { BodyComp } from "@/lib/domain/types";

const FIELDS = [
  { key: "weight_kg", label: "Weight", unit: "kg", step: "0.1" },
  { key: "skeletal_muscle_kg", label: "Skeletal muscle", unit: "kg", step: "0.1" },
  { key: "body_fat_kg", label: "Body fat mass", unit: "kg", step: "0.1" },
  { key: "body_fat_pct", label: "Body fat", unit: "%", step: "0.1" },
  { key: "bmr", label: "BMR", unit: "kcal", step: "1" },
  { key: "visceral_fat", label: "Visceral fat", unit: "level", step: "0.1" },
  { key: "inbody_score", label: "InBody score", unit: "", step: "1" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export function BodyCompSheet({ today, latest }: { today: string; latest: BodyComp | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [values, setValues] = useState<Record<FieldKey, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, ""])) as Record<FieldKey, string>,
  );
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      try {
        await saveBodyComp({
          measured_on: date,
          weight_kg: num(values.weight_kg),
          skeletal_muscle_kg: num(values.skeletal_muscle_kg),
          body_fat_kg: num(values.body_fat_kg),
          body_fat_pct: num(values.body_fat_pct),
          bmr: int(values.bmr),
          visceral_fat: num(values.visceral_fat),
          inbody_score: int(values.inbody_score),
          notes: notes.trim() || null,
        });
        setOpen(false);
        toast.success("Scan saved.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save that scan.");
      }
    });
  }

  return (
    <>
      <Button variant="soft" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" aria-hidden />
        InBody
      </Button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Add an InBody scan"
        description={
          latest
            ? `Your last one was ${latest.measured_on}. Fill in whatever the printout gives you.`
            : "Fill in whatever the printout gives you. Every field is optional."
        }
      >
        <div className="space-y-4">
          <FieldRow label="Date of the scan" htmlFor="scan-date">
            <Input
              id="scan-date"
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
            />
          </FieldRow>

          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((field) => (
              <FieldRow key={field.key} label={field.label} htmlFor={`scan-${field.key}`}>
                <Input
                  id={`scan-${field.key}`}
                  type="number"
                  inputMode="decimal"
                  step={field.step}
                  placeholder={field.unit || "—"}
                  value={values[field.key]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.key]: e.target.value }))
                  }
                />
              </FieldRow>
            ))}
          </div>

          <FieldRow label="Notes">
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the technician said"
              aria-label="Scan notes"
            />
          </FieldRow>

          <Button variant="glitter" size="lg" block loading={pending} onClick={save}>
            Save scan
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function num(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function int(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
