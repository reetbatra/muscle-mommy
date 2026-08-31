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
    body: "Log a set and the next session already knows the answer. 30kg for ten and twelve last week means eleven and twelve this week, and when every set clears the top of your range it puts the weight up for you.",
  },
  {
    icon: Camera,
    title: "Photograph the plate, not the label",
    body: "Take a picture of what you ate. You get calories, protein, carbs, fat and fibre, with the portion it assumed written down so you can correct it in two taps.",
  },
  {
    icon: Footprints,
    title: "Steps and cycle come from Apple Health",
    body: "One Shortcut on your phone pushes steps, weight, sleep and energy burned every morning. No third-party app, no subscription, no opening anything.",
  },
  {
    icon: BookOpen,
    title: "The small things count too",
    body: "Supplements, protein, fibre, water, teeth, moisturiser, skincare, ten pages. Tap them off. They keep a streak.",
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-safe pb-20">
      <header className="pt-14 pb-4 text-center">
        <div className="glitter-fill shimmer mx-auto flex size-16 items-center justify-center rounded-3xl shadow-[0_10px_30px_-12px_rgb(219_39_119/0.6)]">
          <Dumbbell className="size-8 text-white" aria-hidden />
        </div>
        <h1 className="font-display mt-6 text-[42px] leading-[1.05] font-bold tracking-tight">
          <span className="glitter-text">Muscle Mommy</span>
        </h1>
        <p className="mx-auto mt-4 max-w-[30ch] text-lg leading-relaxed text-ink-soft">
          Your lifts, your macros, your steps and the little habits. One app, and it actually
          remembers what you did last week.
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
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Getting stronger means doing slightly more than last time, every time. That is easy to
          say and impossible to hold in your head across four training days and twenty exercises.
          So the app holds it instead.
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
          <p className="mt-2 text-sm text-ink-soft">
            Two sets need one more rep. Get all three to twelve and the app moves you to 35kg.
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
        <p className="mt-6 text-xs leading-relaxed text-ink-faint">
          Add it to your home screen from Safari and it behaves like any other app on your phone.
        </p>
      </section>
    </main>
  );
}
