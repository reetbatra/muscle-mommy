"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Plus, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createIngestToken, revokeIngestToken } from "@/lib/actions/settings";
import type { IngestToken } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const HEALTH_FIELDS = [
  ["steps", "Steps", "Sum"],
  ["active_kcal", "Active Energy", "Sum"],
  ["basal_kcal", "Resting Energy", "Sum"],
  ["exercise_minutes", "Exercise Minutes", "Sum"],
  ["sleep_minutes", "Sleep, in minutes", "Sum"],
  ["weight_kg", "Weight, in kg", "Latest"],
  ["resting_hr", "Resting Heart Rate", "Average"],
] as const;

export function HealthSync({
  tokens,
  siteUrl,
}: {
  tokens: IngestToken[];
  siteUrl: string;
}) {
  const router = useRouter();
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const active = tokens.filter((t) => !t.revoked_at);
  const endpoint = `${siteUrl}/api/health/ingest`;

  function mint() {
    startTransition(async () => {
      try {
        const { token } = await createIngestToken("Apple Shortcut");
        setFreshToken(token);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create a token.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-ink-soft">
        Safari cannot read Apple Health directly. No web app can. What works instead is a Shortcut
        on your phone that reads Health and posts the numbers here every morning. You set it up
        once and then never think about it.
      </p>

      {active.length === 0 ? (
        <Button variant="glitter" size="lg" block loading={pending} onClick={mint}>
          <Plus className="size-4" aria-hidden />
          Create my sync token
        </Button>
      ) : (
        <ul className="space-y-2">
          {active.map((token) => (
            <li
              key={token.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{token.label}</p>
                <p className="tnum text-xs text-ink-faint">
                  {token.token_prefix}…{" "}
                  {token.last_used_at
                    ? `last used ${new Date(token.last_used_at).toLocaleDateString()}`
                    : "never used yet"}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      await revokeIngestToken(token.id);
                      toast.success("Token revoked.");
                      router.refresh();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Could not revoke it.");
                    }
                  })
                }
                aria-label={`Revoke ${token.label}`}
                className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-faint transition-colors duration-150 hover:bg-surface-2 hover:text-[var(--coral)]"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {freshToken ? (
        <div className="rounded-2xl border-2 border-[var(--ring)] bg-surface-2 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--pink-deep)]">
            <TriangleAlert className="size-3.5" aria-hidden />
            Copy this now. It is not shown again.
          </p>
          <CopyBlock label="Your token" value={freshToken} className="mt-3" />
        </div>
      ) : null}

      {active.length > 0 ? (
        <>
          <Button variant="soft" size="sm" block loading={pending} onClick={mint}>
            <Plus className="size-3.5" aria-hidden />
            Create another token
          </Button>

          <div className="border-t border-line pt-5">
            <h3 className="font-display text-base font-semibold text-ink">
              Setting up the Shortcut
            </h3>
            <ol className="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft">
              <Step n={1}>
                Open the Shortcuts app and make a new shortcut. Call it{" "}
                <strong className="text-ink">Muscle Mommy Sync</strong>.
              </Step>
              <Step n={2}>
                Add a <strong className="text-ink">Find Health Samples Where</strong> action for
                each thing you want, set the date to Today, and pick the right calculation:
                <ul className="tnum mt-2 space-y-1 rounded-xl bg-surface-2 p-3 text-xs">
                  {HEALTH_FIELDS.map(([key, sample, calc]) => (
                    <li key={key} className="flex justify-between gap-3">
                      <span className="font-semibold text-ink">{sample}</span>
                      <span className="text-ink-faint">
                        {calc} → {key}
                      </span>
                    </li>
                  ))}
                </ul>
                Skip any you do not care about. Everything except the date is optional.
              </Step>
              <Step n={3}>
                Add a <strong className="text-ink">Get Contents of URL</strong> action pointed at
                this address, with the method set to POST:
                <CopyBlock label="Endpoint" value={endpoint} className="mt-2" />
              </Step>
              <Step n={4}>
                Under Headers, add <strong className="text-ink">Authorization</strong> with the
                value <code className="rounded bg-surface-3 px-1 text-xs">Bearer</code> followed by
                your token, and <strong className="text-ink">Content-Type</strong> set to{" "}
                <code className="rounded bg-surface-3 px-1 text-xs">application/json</code>.
              </Step>
              <Step n={5}>
                Set Request Body to JSON and build these keys, dropping in the variables from step
                two. Only <code className="rounded bg-surface-3 px-1 text-xs">date</code> is
                required:
                <CopyBlock
                  label="Body shape"
                  className="mt-2"
                  value={`{
  "date": "2026-08-31",
  "steps": 8421,
  "active_kcal": 412,
  "basal_kcal": 1380,
  "exercise_minutes": 38,
  "sleep_minutes": 431,
  "weight_kg": 61.2,
  "resting_hr": 58
}`}
                />
              </Step>
              <Step n={6}>
                Go to the Automation tab, add a <strong className="text-ink">Time of Day</strong>{" "}
                automation for around 7am, daily, and set it to run this shortcut immediately with
                no confirmation.
              </Step>
            </ol>

            <p className="mt-4 rounded-2xl bg-surface-2 p-3 text-xs leading-relaxed text-ink-soft">
              Posting the same date twice is safe. It merges rather than overwrites, so a
              steps-only push will not wipe your weight.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="tnum flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--pink-deep)] text-xs font-bold text-white">
        {n}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}

function CopyBlock({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-line bg-surface", className)}>
      <pre className="max-h-52 overflow-auto px-3 py-2.5 text-xs leading-relaxed break-all whitespace-pre-wrap text-ink">
        {value}
      </pre>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            toast.error("Your browser blocked the clipboard. Select the text and copy it by hand.");
          }
        }}
        className="flex min-h-10 w-full cursor-pointer items-center justify-center gap-1.5 border-t border-line text-xs font-bold text-ink-soft transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
      >
        {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        {copied ? "Copied" : `Copy ${label.toLowerCase()}`}
      </button>
    </div>
  );
}
