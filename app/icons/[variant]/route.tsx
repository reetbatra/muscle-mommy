import { ImageResponse } from "next/og";

export const dynamic = "force-static";

/**
 * Icons are drawn rather than shipped as binaries, so the palette can never
 * drift away from the design tokens. Pure shapes only: satori needs a font
 * file for text and this route deliberately has none.
 */
export function generateStaticParams() {
  return [{ variant: "192" }, { variant: "512" }, { variant: "maskable" }];
}

const VARIANTS: Record<string, { size: number; padding: number; radius: number }> = {
  "192": { size: 192, padding: 34, radius: 44 },
  "512": { size: 512, padding: 92, radius: 118 },
  maskable: { size: 512, padding: 150, radius: 0 },
};

export async function GET(_request: Request, ctx: { params: Promise<{ variant: string }> }) {
  const { variant } = await ctx.params;
  const config = VARIANTS[variant] ?? VARIANTS["512"];
  const { size, padding, radius } = config;

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius,
          background: "#f9dce6",
        }}
      >
        <svg
          width={size - padding * 2}
          height={size - padding * 2}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#a8395f"
          strokeWidth={2.1}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.4 14.4 9.6 9.6" />
          <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z" />
          <path d="m21.5 21.5-1.4-1.4" />
          <path d="M3.9 3.9 2.5 2.5" />
          <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
