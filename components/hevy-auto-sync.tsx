"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const KEY = "mm:hevy-sync-at";
const INTERVAL_MS = 5 * 60_000;

/**
 * Pulls anything new out of Hevy when the app is opened, then refreshes the
 * page if something actually arrived. Fire and forget, so it never delays a
 * render, and rate limited per tab so navigating around does not hammer it.
 */
export function HevyAutoSync() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const last = Number(window.sessionStorage.getItem(KEY) ?? 0);
        if (Date.now() - last < INTERVAL_MS) return;
        window.sessionStorage.setItem(KEY, String(Date.now()));
      } catch {
        // Private browsing blocks sessionStorage. Syncing anyway is fine.
      }

      try {
        const response = await fetch("/api/hevy/sync", { method: "POST" });
        if (!response.ok) return;
        const payload = await response.json();
        if (cancelled || !payload.changed) return;

        const imported = payload.imported ?? 0;
        if (imported > 0) {
          toast.success(
            imported === 1
              ? "Picked up a new workout from Hevy."
              : `Picked up ${imported} workouts from Hevy.`,
          );
        }
        router.refresh();
      } catch {
        // Offline, or Hevy is down. The nightly sync will catch up.
      }
    };

    const timer = window.setTimeout(run, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [router]);

  return null;
}
