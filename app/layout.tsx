import type { Metadata, Viewport } from "next";
import { Fredoka, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#140816" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${jakarta.variable}`}>
      <body className="antialiased">
        {children}
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            style: {
              background: "var(--surface)",
              color: "var(--ink)",
              border: "1px solid var(--border)",
              borderRadius: "1rem",
              fontFamily: "var(--font-jakarta)",
            },
          }}
        />
      </body>
    </html>
  );
}
