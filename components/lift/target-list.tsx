import { PrescriptionBadge } from "./prescription-badge";
import type { Prescription } from "@/lib/domain/overload";
import { trimNumber } from "@/lib/utils";

/** The read-only preview of what the engine wants from a single exercise. */
export function TargetRow({
  name,
  prescription,
  notes,
}: {
  name: string;
  prescription: Prescription;
  notes?: string | null;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base leading-tight font-semibold text-ink">{name}</h3>
          <p className="mt-0.5 text-sm font-medium text-ink-soft">{prescription.headline}</p>
        </div>
        <PrescriptionBadge status={prescription.status} />
      </div>

      <TargetChips prescription={prescription} className="mt-3" />

      <p className="mt-3 text-xs leading-relaxed text-ink-soft">{prescription.detail}</p>

      {prescription.previousLabel ? (
        <p className="tnum mt-1.5 text-xs text-ink-faint">
          Last time: {prescription.previousLabel}
        </p>
      ) : null}

      {notes ? (
        <p className="mt-2 rounded-[2px] bg-surface-2 px-3 py-2 text-xs text-ink-soft">{notes}</p>
      ) : null}
    </div>
  );
}

export function TargetChips({
  prescription,
  className,
}: {
  prescription: Prescription;
  className?: string;
}) {
  return (
    <ol className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {prescription.targets.map((target) => (
        <li
          key={target.setIndex}
          className="tnum flex items-baseline gap-1 rounded-[2px] bg-surface-2 px-2.5 py-1.5 text-sm font-bold text-ink"
        >
          <span className="text-[10px] font-bold text-ink-faint">{target.setIndex}</span>
          {target.weightKg !== null && target.weightKg > 0 ? (
            <>
              <span>{trimNumber(target.weightKg)}kg</span>
              <span className="text-ink-faint">×</span>
            </>
          ) : null}
          <span>{target.reps}</span>
          {target.toFailure ? (
            <span className="text-[10px] font-bold text-[var(--pink-deep)]">+</span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
