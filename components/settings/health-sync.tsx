"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Plus, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createIngestToken, revokeIngestToken } from "@/lib/actions/settings";
import type { IngestToken } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/** The four marked essential are the ones the deficit and step ring run on. */
const HEALTH_FIELDS = [
  ["steps", "Steps", "Sum", true],
  ["active_kcal", "Active Energy", "Sum", true],
  ["basal_kcal", "Resting Energy", "Sum", true],
  ["weight_kg", "Weight", "Newest one", true],
  ["exercise_minutes", "Exercise Minutes", "Sum", false],
  ["sleep_minutes", "Sleep", "Sum", false],
  ["resting_hr", "Resting Heart Rate", "Average", false],
] as const;

export type LastReceived = {
  logDate: string;
  steps: number | null;
  activeKcal: number | null;
  basalKcal: number | null;
  weightKg: number | null;
  sleepMinutes: number | null;
} | null;

export function HealthSync({
  tokens,
  siteUrl,
  lastReceived,
}: {
  tokens: IngestToken[];
  siteUrl: string;
  lastReceived: LastReceived;
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
                className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-faint transition-colors duration-150 hover:bg-surface-2 hover:text-[var(--bad)]"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {active.length > 0 ? <ReceivedPanel last={lastReceived} /> : null}

      {freshToken ? (
        <div className="rounded-2xl border-2 border-[var(--ring)] bg-surface-2 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent)]">
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
            <ol className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-soft">
              <Step n={1}>
                Shortcuts app, new shortcut, call it{" "}
                <strong className="text-ink">Muscle Mommy</strong>.
              </Step>
              <Step n={2}>
                For each row below add three actions:{" "}
                <strong className="text-ink">Find Health Samples Where</strong> with that type and
                a filter of Start Date is Today, then{" "}
                <strong className="text-ink">Calculate Statistics</strong> set to Sum of Value,
                then <strong className="text-ink">Set Variable</strong> with that name.
                <ul className="tnum mt-2 space-y-1 border border-line p-3 text-[14px]">
                  {HEALTH_FIELDS.map(([key, sample, calc, essential]) => (
                    <li key={key} className="flex justify-between gap-3">
                      <span className="font-semibold text-ink">
                        {sample}
                        {essential ? null : (
                          <span className="ml-1.5 font-normal text-ink-faint">optional</span>
                        )}
                      </span>
                      <span className="text-ink-faint">
                        {calc} → {key}
                      </span>
                    </li>
                  ))}
                </ul>
                Weight is the odd one: instead of Calculate Statistics, set Sort by to Start Date,
                Latest First, Limit 1, then add{" "}
                <strong className="text-ink">Get Details of Health Sample</strong> and pick Value.
              </Step>
              <Step n={3}>
                Add <strong className="text-ink">Get Contents of URL</strong>, method POST, pointed
                here:
                <CopyBlock label="Endpoint" value={endpoint} className="mt-2" />
              </Step>
              <Step n={4}>
                Under Headers add <strong className="text-ink">Authorization</strong> set to{" "}
                <code className="bg-surface-2 px-1 text-[13px]">Bearer</code> then a space then
                your token, and <strong className="text-ink">Content-Type</strong> set to{" "}
                <code className="bg-surface-2 px-1 text-[13px]">application/json</code>.
              </Step>
              <Step n={5}>
                Set Request Body to JSON and add one field per variable. No date field is needed,
                it uses today in your timezone.
                <CopyBlock
                  label="Body shape"
                  className="mt-2"
                  value={`{
  "steps": 9412,
  "active_kcal": 468,
  "basal_kcal": 1342
}`}
                />
              </Step>
              <Step n={6}>
                Automation tab, plus, <strong className="text-ink">Time of Day</strong>, around
                10pm, Daily, run this shortcut, and turn off Ask Before Running.
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

/**
 * What actually arrived. Without this, a Shortcut that posts zeros looks
 * identical to one that was never set up, and there is no way to tell whether
 * the problem is the phone or the app.
 */
function ReceivedPanel({ last }: { last: LastReceived }) {
  if (!last) {
    return (
      <p className="border border-line p-3 text-[14px] leading-relaxed text-ink-soft">
        Nothing received yet. Run the shortcut once by hand and this fills in. While it is not
        working, tap the pencil on the Movement card on{" "}
        <Link href="/today" className="text-[var(--accent)] underline">
          Today
        </Link>{" "}
        and type the numbers straight off the Health app.
      </p>
    );
  }

  const rows: [string, string][] = [
    ["Steps", format(last.steps)],
    ["Active energy", format(last.activeKcal, "kcal")],
    ["Resting energy", format(last.basalKcal, "kcal")],
    ["Weight", format(last.weightKg, "kg")],
    ["Sleep", last.sleepMinutes ? `${Math.floor(last.sleepMinutes / 60)}h ${last.sleepMinutes % 60}m` : "nothing"],
  ];

  const allEmpty = [last.steps, last.activeKcal, last.basalKcal].every((v) => !v);

  return (
    <div className="border border-line p-3">
      <p className="eyebrow">Last received, {last.logDate}</p>
      <dl className="tnum mt-2 space-y-1 text-[14px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-ink-soft">{label}</dt>
            <dd className={value === "nothing" || value === "0" ? "text-[var(--bad)]" : "text-ink"}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {allEmpty ? (
        <p className="mt-3 border-t border-line pt-3 text-[14px] leading-relaxed text-ink-soft">
          Zeros mean the shortcut reached the app but the Health actions found no samples. In
          Shortcuts, open one of the Find Health Samples actions, check the type is right, and tap
          the result to Quick Look it. If that shows nothing, the filter is the problem, usually
          Start Date not set to Today, or Health access not granted yet.
        </p>
      ) : null}
    </div>
  );
}

function format(value: number | null, unit?: string) {
  if (value === null || value === undefined) return "nothing";
  return unit ? `${value.toLocaleString()} ${unit}` : value.toLocaleString();
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="tnum flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
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
