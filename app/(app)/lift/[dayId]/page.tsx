import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import { getSessionContext } from "@/lib/data";
import { getDayPlan } from "@/lib/plan";
import { startSession } from "@/lib/actions/workout";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { TargetRow } from "@/components/lift/target-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Dumbbell } from "lucide-react";

export const metadata: Metadata = { title: "Today's targets" };
export const dynamic = "force-dynamic";

export default async function DayPage({ params }: { params: Promise<{ dayId: string }> }) {
  const { dayId } = await params;
  const ctx = await getSessionContext();
  const plan = await getDayPlan(dayId, ctx.loadConfig);
  if (!plan) notFound();

  const movingUp = plan.items.filter((i) => i.prescription.status === "add-weight").length;

  async function begin() {
    "use server";
    await startSession(dayId, ctx.today);
  }

  return (
    <Screen>
      <div className="pt-5">
        <Link
          href="/lift"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors duration-200 hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Split
        </Link>
      </div>

      <header className="pt-3 pb-5">
        <h1 className="font-display text-[27px] leading-tight font-semibold text-ink">
          {plan.day.name}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {plan.day.subtitle ? `${plan.day.subtitle}. ` : ""}
          {movingUp > 0
            ? `${movingUp} ${movingUp === 1 ? "exercise moves" : "exercises move"} up in weight today.`
            : "Everything is a rep chase today."}
        </p>
      </header>

      {plan.items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Dumbbell}
            title="Nothing in this day yet"
            body="Add some exercises and the app will start prescribing targets for them."
          />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {plan.items.map((item) => (
              <TargetRow
                key={item.routineExercise.id}
                name={item.name}
                prescription={item.prescription}
                notes={item.routineExercise.notes}
              />
            ))}
          </div>

          <form action={begin} className="sticky bottom-24 z-30 mt-6">
            <Button type="submit" variant="glitter" size="lg" block>
              <Play className="size-4" aria-hidden />
              Start {plan.day.name}
            </Button>
          </form>
        </>
      )}
    </Screen>
  );
}
