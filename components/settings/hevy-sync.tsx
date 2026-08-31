"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Link2Off, RefreshCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldRow, Input, Select } from "@/components/ui/field";
import {
  connectHevy,
  disconnectHevy,
  remapHevyExercise,
  setHevyAutoSync,
  syncHevyNow,
  type HevyStatus,
} from "@/lib/actions/hevy";
import type { Exercise } from "@/lib/domain/types";

export function HevySync({
  status,
  library,
}: {
  status: HevyStatus;
  library: Exercise[];
}) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [pending, startTransition] = useTransition();

  function connect() {
    startTransition(async () => {
      try {
        const result = await connectHevy(apiKey);
        setApiKey("");
        toast.success(
          result.imported > 0
            ? `Connected. Pulled in ${result.imported} ${result.imported === 1 ? "workout" : "workouts"}, ${result.recognisedDays} matched to a day of your split.`
            : "Connected. Nothing to import yet.",
        );
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not connect to Hevy.");
      }
    });
  }

  if (!status.connected) {
    return (
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-ink-soft">
          If you log your sets in Hevy, connect it and the workouts come across on their own. The
          app works out which day of your split each one was, from the exercises in it, and keeps
          prescribing your next targets from there. You carry on tapping sets into Hevy.
        </p>

        <ol className="space-y-2 text-sm text-ink-soft">
          <li className="flex gap-2.5">
            <span className="font-bold text-[var(--accent)]">1.</span>
            <span>
              Open{" "}
              <a
                href="https://hevy.com/settings?developer"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 font-semibold text-[var(--accent)] underline"
              >
                hevy.com/settings?developer
                <ExternalLink className="size-3" aria-hidden />
              </a>{" "}
              on a computer and generate an API key.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="font-bold text-[var(--accent)]">2.</span>
            <span>Paste it below. It is stored server side and never sent back to your browser.</span>
          </li>
        </ol>

        <FieldRow
          label="Hevy API key"
          htmlFor="hevy-key"
          hint="Hevy only issues API keys to Pro accounts. Without Pro, log your sets here instead and everything still works."
        >
          <Input
            id="hevy-key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your key"
            autoComplete="off"
            spellCheck={false}
          />
        </FieldRow>

        <Button
          variant="glitter"
          size="lg"
          block
          loading={pending}
          disabled={apiKey.trim().length < 20}
          onClick={connect}
        >
          Connect Hevy
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--good)] bg-surface-2 p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--good)] text-white">
          <Check className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            Connected{status.username ? ` as ${status.username}` : ""}
          </p>
          <p className="text-xs text-ink-faint">
            {status.workoutsImported} imported
            {status.lastSyncedAt
              ? ` · last checked ${new Date(status.lastSyncedAt).toLocaleString()}`
              : ""}
          </p>
        </div>
      </div>

      {status.lastError ? (
        <p className="flex items-start gap-2 rounded-2xl border border-[var(--bad)] bg-surface-2 p-3 text-sm text-ink">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--bad)]" aria-hidden />
          {status.lastError}
        </p>
      ) : null}

      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface px-4">
        <input
          type="checkbox"
          checked={status.autoSync}
          className="size-5 accent-[var(--accent)]"
          onChange={(e) =>
            startTransition(async () => {
              try {
                await setHevyAutoSync(e.target.checked);
                router.refresh();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not change that.");
              }
            })
          }
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink">Check on every app open</span>
          <span className="block text-xs text-ink-faint">
            Plus a nightly catch-up, so nothing is missed
          </span>
        </span>
      </label>

      <div className="flex gap-2">
        <Button
          variant="soft"
          size="md"
          block
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                const result = await syncHevyNow();
                toast.success(
                  result.imported + result.updated === 0
                    ? "Already up to date."
                    : `${result.imported} new, ${result.updated} updated.`,
                );
                router.refresh();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Sync failed.");
              }
            })
          }
        >
          <RefreshCw className="size-4" aria-hidden />
          Sync now
        </Button>
        <Button
          variant="ghost"
          size="md"
          className="text-[var(--bad)]"
          onClick={() =>
            startTransition(async () => {
              try {
                await disconnectHevy();
                toast.success("Disconnected. Your imported workouts stay.");
                router.refresh();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not disconnect.");
              }
            })
          }
        >
          <Link2Off className="size-4" aria-hidden />
          Disconnect
        </Button>
      </div>

      {status.unmatched.length > 0 ? (
        <div className="border-t border-line pt-5">
          <h3 className="font-display text-base font-semibold text-ink">
            {status.unmatched.length} {status.unmatched.length === 1 ? "lift" : "lifts"} the app
            could not place
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            These came in under their Hevy name rather than being guessed into the wrong exercise.
            Point each one at the right lift and its history moves across.
          </p>

          <ul className="mt-4 space-y-3">
            {status.unmatched.map((item) => (
              <li key={item.hevyTemplateId}>
                <p className="text-sm font-semibold text-ink">{item.exerciseName}</p>
                <Select
                  className="mt-1.5"
                  defaultValue=""
                  aria-label={`Match ${item.exerciseName} to a library exercise`}
                  onChange={(e) => {
                    const target = e.target.value;
                    if (!target) return;
                    startTransition(async () => {
                      try {
                        await remapHevyExercise(item.hevyTemplateId, target);
                        toast.success("Remapped, and the history moved with it.");
                        router.refresh();
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "Could not remap that.",
                        );
                      }
                    });
                  }}
                >
                  <option value="">Leave it as its own exercise</option>
                  {library
                    .filter((exercise) => exercise.muscle_group !== "From Hevy")
                    .map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.name}
                      </option>
                    ))}
                </Select>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
