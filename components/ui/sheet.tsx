"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A bottom sheet, because this app only ever runs on a phone. Escape closes
 * it, focus moves inside on open, and the page behind does not scroll.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const headingId = React.useId();

  /*
   * onClose is almost always an inline arrow, so it gets a fresh identity on
   * every render. Listing it as a dependency re-ran this effect on every
   * keystroke, and the focus() call inside pulled focus off whatever input was
   * being typed into. On a phone that closes the keyboard after each character.
   *
   * The handler lives in a ref instead, so the effect depends only on `open`
   * and runs once per opening.
   */
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  });

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgb(59_11_51/0.45)] backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className={cn(
              "relative w-full max-w-lg rounded-t-3xl border border-line bg-surface",
              "max-h-[88dvh] overflow-y-auto pb-safe shadow-[var(--shadow-lift)]",
              "sm:rounded-3xl focus:outline-none",
              className,
            )}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-surface/95 px-5 py-4 backdrop-blur">
              <div className="min-w-0">
                <h2 id={headingId} className="font-display text-lg font-semibold text-ink">
                  {title}
                </h2>
                {description ? (
                  <p className="mt-0.5 text-sm text-ink-soft">{description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="px-5 py-5">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
