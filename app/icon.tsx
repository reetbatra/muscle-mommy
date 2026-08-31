import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * The browser tab icon. Drawn from plain boxes rather than the detailed
 * dumbbell used at 192px and up, because thin strokes turn to mush at 32px.
 * Two rounded ends and a bar still read as a dumbbell at any size.
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
          borderRadius: 8,
          background: "linear-gradient(135deg, #f472b6 0%, #c084fc 52%, #67e8f9 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 5, height: 17, background: "#ffffff", borderRadius: 2 }} />
          <div style={{ width: 8, height: 5, background: "#ffffff" }} />
          <div style={{ width: 5, height: 17, background: "#ffffff", borderRadius: 2 }} />
        </div>
      </div>
    ),
    size,
  );
}
