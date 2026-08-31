import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The home-screen icon. iOS masks it into a squircle itself, so no radius. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fbf9f4",
          position: "relative",
        }}
      >
        <svg
          width={104}
          height={104}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8a6b33"
          strokeWidth={2.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.4 14.4 9.6 9.6" />
          <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z" />
          <path d="m21.5 21.5-1.4-1.4" />
          <path d="M3.9 3.9 2.5 2.5" />
          <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" />
        </svg>
        {/* A sparkle, tucked top right. */}
        <svg
          width={30}
          height={30}
          viewBox="0 0 24 24"
          fill="#8a6b33"
          style={{ position: "absolute", top: 26, right: 26 }}
        >
          <path d="M12 0c.9 5.7 5.4 10.2 11.1 11.1C17.4 12 12.9 16.5 12 22.2 11.1 16.5 6.6 12 .9 11.1 6.6 10.2 11.1 5.7 12 0Z" />
        </svg>
      </div>
    ),
    size,
  );
}
