import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const button = cva(
  "relative inline-flex items-center justify-center gap-2 rounded-[2px] font-normal " +
    "font-[family-name:var(--font-display)] " +
    "transition-[background-color,color,border-color,opacity] duration-200 " +
    "cursor-pointer select-none " +
    "disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        // The primary action. Outlined bronze, filled on press, because
        // nothing in this design shouts by default.
        glitter:
          "border border-[var(--accent)] text-[var(--accent)] bg-transparent " +
          "hover:bg-[var(--accent)] hover:text-[var(--bg)] active:bg-[var(--accent)] active:text-[var(--bg)]",
        solid: "bg-[var(--accent)] text-[var(--bg)] hover:opacity-90",
        lilac: "bg-[var(--accent-soft)] text-[var(--bg)] hover:opacity-90",
        soft: "border border-line bg-surface-2 text-ink hover:border-line-strong",
        outline: "border border-line-strong text-ink hover:bg-surface-2",
        ghost: "text-ink-soft hover:text-ink",
        danger: "border border-[var(--bad)] text-[var(--bad)] hover:bg-[var(--bad)] hover:text-[var(--bg)]",
      },
      size: {
        sm: "h-10 px-4 text-[15px]",
        md: "h-12 px-5 text-base",
        lg: "h-13 px-7 text-[17px]",
        icon: "h-11 w-11",
        iconLg: "h-14 w-14",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "solid", size: "md", block: false },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button> & { loading?: boolean };

export function Button({
  className,
  variant,
  size,
  block,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(button({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export { button as buttonVariants };

/**
 * A link that looks like a button. Kept separate so a `<button>` never ends up
 * wrapping an `<a>`, which is invalid and breaks keyboard navigation.
 */
export function LinkButton({
  className,
  variant,
  size,
  block,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & VariantProps<typeof button>) {
  return <a className={cn(button({ variant, size, block }), className)} {...props} />;
}
