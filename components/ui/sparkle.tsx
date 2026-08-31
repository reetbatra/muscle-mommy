/**
 * Four-point sparkle, drawn rather than an emoji so it takes the accent colour
 * and stays crisp at any size. It marks the three things worth noticing: a
 * weight going up, being under on calories, and a day fully cleared.
 */
export function Sparkle({
  size = 13,
  twinkle = false,
  className,
}: {
  size?: number;
  twinkle?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={`inline-block shrink-0 align-middle ${twinkle ? "twinkle" : ""} ${className ?? ""}`}
    >
      <path d="M12 0c.9 5.7 5.4 10.2 11.1 11.1C17.4 12 12.9 16.5 12 22.2 11.1 16.5 6.6 12 .9 11.1 6.6 10.2 11.1 5.7 12 0Z" />
    </svg>
  );
}
