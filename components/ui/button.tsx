import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const button = cva(
  "relative inline-flex items-center justify-center gap-2 rounded-full font-semibold " +
    "transition-[transform,background-color,color,box-shadow,opacity] duration-200 " +
    "cursor-pointer select-none active:scale-[0.97] " +
    "disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // The showy one. White on a saturated gradient, used sparingly.
        glitter:
          "text-white shadow-[0_8px_24px_-8px_rgb(219_39_119/0.55)] glitter-fill hover:brightness-105",
        solid: "bg-[var(--pink-deep)] text-white hover:brightness-110",
        lilac: "bg-[var(--lilac-deep)] text-white hover:brightness-110",
        soft: "bg-surface-2 text-ink border border-line hover:bg-surface-3",
        outline: "border-2 border-line-strong text-ink hover:bg-surface-2",
        ghost: "text-ink-soft hover:bg-surface-2 hover:text-ink",
        danger: "bg-[var(--coral)] text-white hover:brightness-110",
      },
      size: {
        sm: "h-10 px-4 text-sm",
        md: "h-12 px-5 text-[15px]",
        lg: "h-14 px-7 text-base",
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
