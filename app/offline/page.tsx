import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-[var(--accent)]">
        <WifiOff className="size-6" aria-hidden />
      </div>
      <h1 className="font-display text-2xl font-semibold text-ink">No signal</h1>
      <p className="max-w-[34ch] text-sm leading-relaxed text-ink-soft">
        Gym wifi does this. Pages you have already opened still work. Anything you log will save as
        soon as you are back on.
      </p>
    </main>
  );
}
