import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * The browser tab icon. Paper ground, bronze dumbbell, one sparkle.
 *
 * It has to stay on the diagonal: two blocks joined by a bar, sitting level,
 * reads as a capital H at this size. A hairline edge keeps a light icon from
 * dissolving into a light browser tab.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
          background: "#fbf9f4",
          border: "1px solid #ded5c4",
          position: "relative",
        }}
      >
        <svg
          width={25}
          height={25}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8a6b33"
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.4 14.4 9.6 9.6" />
          <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z" />
          <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" />
        </svg>
      </div>
    ),
    size,
  );
}
