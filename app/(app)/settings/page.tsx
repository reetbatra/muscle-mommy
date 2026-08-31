import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Dumbbell,
  HeartPulse,
  ListChecks,
  LogOut,
  Share,
  Target,
  UserRound,
  Utensils,
} from "lucide-react";
import { getSessionContext } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/settings";
import { env } from "@/lib/env";
import { Screen, ScreenHeader } from "@/components/screen";
import { Button, buttonVariants } from "@/components/ui/button";
import { SettingsSection } from "@/components/settings/section";
import { GoalsForm } from "@/components/settings/goals-form";
import { GymForm } from "@/components/settings/gym-form";
import { HealthSync } from "@/components/settings/health-sync";
import { HabitsManager } from "@/components/settings/habits-manager";
import { HevySync } from "@/components/settings/hevy-sync";
import { FoodMemory, type MemoryRow } from "@/components/settings/food-memory";
import { PasswordForm } from "@/components/settings/password-form";
import { getHevyStatus } from "@/lib/actions/hevy";
import type { Exercise } from "@/lib/domain/types";
import type { Habit, IngestToken } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await getSessionContext();
  const { supabase, user } = await requireUser();

  const [{ data: habits }, { data: tokens }, hevy, { data: library }, { data: memories }] =
    await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("ingest_tokens")
      .select("id, token_prefix, label, created_at, last_used_at, revoked_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    getHevyStatus(),
    supabase
      .from("exercises")
      .select("id, user_id, name, muscle_group, equipment")
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order("name"),
    supabase
      .from("food_memories")
      .select("id, name, portion, kcal, protein_g, times_logged, is_pinned")
      .eq("user_id", user.id)
      .order("is_pinned", { ascending: false })
      .order("times_logged", { ascending: false })
      .limit(80),
  ]);

  const activeTokens = ((tokens ?? []) as IngestToken[]).filter((t) => !t.revoked_at);

  return (
    <Screen>
      <ScreenHeader eyebrow={ctx.email ?? ""} title={ctx.profile.display_name ?? "You"} />

      <div className="space-y-3">
        <SettingsSection
          icon={HeartPulse}
          title="Apple Health"
          summary={
            activeTokens.length > 0
              ? `${activeTokens.length} sync ${activeTokens.length === 1 ? "token" : "tokens"} active`
              : "Not connected yet"
          }
          defaultOpen={activeTokens.length === 0}
        >
          <HealthSync tokens={(tokens ?? []) as IngestToken[]} siteUrl={env.siteUrl} />
        </SettingsSection>

        <SettingsSection
          icon={Activity}
          title="Hevy"
          summary={
            hevy.connected
              ? `Connected · ${hevy.workoutsImported} workouts imported`
              : "Import your sets automatically"
          }
        >
          <HevySync status={hevy} library={(library ?? []) as Exercise[]} />
        </SettingsSection>

        <SettingsSection
          icon={Target}
          title="Targets"
          summary={`${ctx.goals.calorie_target} kcal, ${ctx.goals.protein_g}g protein, ${ctx.goals.step_target.toLocaleString()} steps`}
        >
          <GoalsForm goals={ctx.goals} />
        </SettingsSection>

        <SettingsSection
          icon={Utensils}
          title="Food memory"
          summary={
            (memories ?? []).length > 0
              ? `${(memories ?? []).length} portions learned`
              : "Nothing learned yet"
          }
        >
          <FoodMemory memories={(memories ?? []) as MemoryRow[]} />
        </SettingsSection>

        <SettingsSection
          icon={Dumbbell}
          title="Gym hardware"
          summary={`${ctx.loadConfig.dumbbellRack.length} dumbbells, ${ctx.loadConfig.machineIncrementKg}kg machine steps`}
        >
          <GymForm profile={ctx.profile} />
        </SettingsSection>

        <SettingsSection
          icon={ListChecks}
          title="Daily habits"
          summary={`${(habits ?? []).length} tracked`}
        >
          <HabitsManager habits={(habits ?? []) as Habit[]} />
        </SettingsSection>

        <section className="card p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-[var(--pink-deep)]">
              <Share className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-ink">Add to home screen</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                In Safari, tap the share button, then Add to Home Screen. It opens full screen after
                that, with no address bar, and works offline for anything already loaded.
              </p>
            </div>
          </div>
        </section>

        <Link
          href="/lift/edit"
          className={cn(buttonVariants({ variant: "soft", size: "lg", block: true }))}
        >
          <Dumbbell className="size-4" aria-hidden />
          Edit my split
        </Link>

        <SettingsSection
          icon={UserRound}
          title="Account"
          summary={ctx.email ?? "Signed in"}
        >
          <PasswordForm hasPassword={Boolean(user.user_metadata?.has_password)} />

          <p className="mt-6 border-t border-line pt-4 text-[15px] leading-relaxed text-ink-soft">
            Your data lives on a server rather than in Safari, which is what stops it disappearing
            when the browser clears its storage.
          </p>
          <form action={signOut} className="mt-4">
            <Button type="submit" variant="ghost" size="md" block className="text-[var(--coral)]">
              <LogOut className="size-4" aria-hidden />
              Sign out on this device
            </Button>
          </form>
        </SettingsSection>
      </div>
    </Screen>
  );
}
