import { cn } from "@/lib/utils";

/** Every in-app page uses this: a phone-width column with room for the tab bar. */
export function Screen({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("mx-auto w-full max-w-lg px-4 pt-safe pb-32", className)}>{children}</main>
  );
}

export function ScreenHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-3 pt-6 pb-5">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-[0.14em] text-ink-faint uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display mt-1 text-[26px] leading-tight font-semibold text-ink">
          {title}
        </h1>
      </div>
      {action ? <div className="shrink-0 pb-1">{action}</div> : null}
    </header>
  );
}
