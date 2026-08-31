import confetti from "canvas-confetti";

/** Bronze, blue and green, the same three the charts use. */
const PALETTE = ["#8a6b33", "#a85f1b", "#2a6fc4", "#3f7d33", "#fbf9f4"];

function motionAllowed() {
  if (typeof window === "undefined") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A small burst from wherever the user just tapped. */
export function sparkleAt(element: HTMLElement | null) {
  if (!motionAllowed()) return;
  const rect = element?.getBoundingClientRect();
  const origin = rect
    ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight }
    : { x: 0.5, y: 0.5 };

  void confetti({
    particleCount: 22,
    spread: 55,
    startVelocity: 22,
    gravity: 0.7,
    scalar: 0.75,
    ticks: 90,
    shapes: ["star", "circle"],
    colors: PALETTE,
    origin,
    disableForReducedMotion: true,
  });
}

/** The bigger one, for finishing a workout or clearing every habit. */
export function celebrate() {
  if (!motionAllowed()) return;
  const base = {
    spread: 90,
    startVelocity: 38,
    ticks: 160,
    shapes: ["star", "circle"] as ("star" | "circle")[],
    colors: PALETTE,
    disableForReducedMotion: true,
  };
  void confetti({ ...base, particleCount: 70, origin: { x: 0.2, y: 0.7 } });
  void confetti({ ...base, particleCount: 70, origin: { x: 0.8, y: 0.7 } });
  window.setTimeout(() => {
    void confetti({ ...base, particleCount: 50, scalar: 1.1, origin: { x: 0.5, y: 0.5 } });
  }, 160);
}
