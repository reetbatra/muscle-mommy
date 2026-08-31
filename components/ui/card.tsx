import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card p-5", className)} {...props} />;
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="font-display text-lg leading-tight font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
