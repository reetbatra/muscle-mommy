import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Muscle Mommy",
    short_name: "Muscle Mommy",
    description: "Lifts, macros, steps and habits, in one place.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdf6f7",
    theme_color: "#fdf6f7",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Log a lift", short_name: "Lift", url: "/lift" },
      { name: "Log food", short_name: "Food", url: "/food" },
    ],
  };
}
