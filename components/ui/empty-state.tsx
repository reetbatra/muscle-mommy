import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-[2px] bg-surface-2 text-[var(--pink-deep)]">
        <Icon className="size-6" aria-hidden />
      </div>
      <div>
        <p className="font-display text-base font-semibold text-ink">{title}</p>
        <p className="mx-auto mt-1 max-w-[34ch] text-sm text-ink-soft">{body}</p>
      </div>
      {action}
    </div>
  );
}
