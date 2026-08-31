import Link from "next/link";
import {
  BookOpen,
  Camera,
  Dumbbell,
  Footprints,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PILLARS = [
  {
    icon: Dumbbell,
    title: "It tells you what to lift",
    body: "Log a set. Next session already knows the answer, and puts the weight up when you have earned it.",
  },
  {
    icon: Camera,
    title: "Photograph the plate, not the label",
    body: "Photograph it, or just type \u201c200g paneer\u201d. It remembers your portions.",
  },
  {
    icon: Footprints,
    title: "Steps and cycle come from Apple Health",
    body: "One Shortcut pushes steps, weight and energy every morning. Nothing to open.",
  },
  {
    icon: BookOpen,
    title: "The small things count too",
    body: "Supplements, protein, fibre, water, teeth, skincare, ten pages. Tap them off.",
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-safe pb-20">
      <header className="pt-14 pb-4 text-center">
        <div className="mx-auto flex size-16 items-center justify-center border border-line bg-surface">
          <Dumbbell className="size-8 text-[var(--accent)]" strokeWidth={1.6} aria-hidden />
        </div>
        <p className="hand mt-7 text-[38px] leading-none">Muscle Mommy</p>
        <p className="mx-auto mt-5 max-w-[26ch] text-[19px] leading-relaxed text-ink-soft">
          Lifts, macros, steps, habits. It remembers what you did last week.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "glitter", size: "lg", block: true }), "max-w-xs")}
          >
            <Sparkles className="size-4" aria-hidden />
            Start free
          </Link>
          <p className="text-xs text-ink-faint">Takes about two minutes to set up.</p>
        </div>
      </header>

      <section className="mt-14 grid gap-4" aria-label="What the app does">
        {PILLARS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="card p-5">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-[var(--pink-deep)]">
                <Icon className="size-5" aria-hidden />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="card mt-8 p-6" aria-labelledby="overload-heading">
        <div className="flex items-center gap-2 text-[var(--pink-deep)]">
          <TrendingUp className="size-5" aria-hidden />
          <p className="text-xs font-bold tracking-[0.14em] uppercase">The whole point</p>
        </div>
        <h2 id="overload-heading" className="font-display mt-3 text-xl font-semibold text-ink">
          Progressive overload, written down
        </h2>
        <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">
          Slightly more than last time, every time. Impossible to hold in your head across four
          days and twenty lifts. So the app holds it.
        </p>
        <div className="mt-5 rounded-2xl border border-line bg-surface-2 p-4">
          <p className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
            Leg press, last time
          </p>
          <p className="tnum mt-1 text-sm text-ink-soft">30kg for 10, 12, 10</p>
          <p className="mt-4 text-xs font-semibold tracking-wide text-ink-faint uppercase">
            Today
          </p>
          <p className="tnum font-display mt-1 text-lg font-semibold text-ink">
            30kg for 11, 12, 11
          </p>
          <p className="mt-2 text-[15px] text-ink-soft">
            Two sets need a rep. All three at twelve and it moves you to 35kg.
          </p>
        </div>
      </section>

      <section className="mt-8 text-center">
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "glitter", size: "lg", block: true }), "mx-auto max-w-xs")}
        >
          Get started
        </Link>
        <p className="mt-6 text-[13px] text-ink-faint">
          Add to your home screen from Safari.
        </p>
      </section>
    </main>
  );
}
