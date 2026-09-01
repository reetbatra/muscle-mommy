import type { Metadata, Viewport } from "next";
import { EB_Garamond, Homemade_Apple, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
  display: "swap",
});

/** Numbers only. Garamond's old-style figures will not line up in a column. */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

/** Decoration only. One weight, no tabular figures, unreadable under 19px. */
const script = Homemade_Apple({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Muscle Mommy", template: "%s · Muscle Mommy" },
  description:
    "Lifts, macros, steps and the small daily habits, in one place. Built to make progressive overload impossible to lose track of.",
  applicationName: "Muscle Mommy",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Muscle Mommy",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: "Muscle Mommy",
    description: "Lifts, macros, steps and habits, in one place.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // One colour, because the app is light in every case.
  themeColor: "#fdf6f7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${garamond.variable} ${jakarta.variable} ${script.variable}`}>
      <body className="antialiased">
        {children}
        <ServiceWorker />
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            style: {
              background: "var(--surface)",
              color: "var(--ink)",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              fontFamily: "var(--font-garamond)",
            },
          }}
        />
      </body>
    </html>
  );
}
