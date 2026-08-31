"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesColumn, Dumbbell, Settings, Sparkles, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/today", label: "Today", icon: Sparkles },
  { href: "/lift", label: "Lift", icon: Dumbbell },
  { href: "/food", label: "Food", icon: Utensils },
  { href: "/progress", label: "Progress", icon: ChartNoAxesColumn },
  { href: "/settings", label: "You", icon: Settings },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-safe backdrop-blur-xl"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] cursor-pointer flex-col items-center justify-center gap-1 px-1 py-2",
                  "transition-colors duration-200",
                  active ? "text-[var(--accent)]" : "text-ink-faint hover:text-ink-soft",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full transition-colors duration-200",
                    active && "bg-surface-3",
                  )}
                >
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <span className="text-[11px] leading-none font-semibold">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
