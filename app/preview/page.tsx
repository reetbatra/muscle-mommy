import type { Metadata } from "next";
import { EB_Garamond, Homemade_Apple, Plus_Jakarta_Sans } from "next/font/google";
import { PreviewSwitcher } from "./switcher";
import "./preview.css";

const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
  display: "swap",
});

const script = Homemade_Apple({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Design directions",
  robots: { index: false, follow: false },
};

/**
 * Three design directions rendered as the real thing, with the real fonts, at
 * real sizes, on the real content. Not a picture of a design.
 *
 * This route is temporary and unlisted. It comes out once a direction is
 * picked.
 */
export default function PreviewPage() {
  return (
    <div className={`${garamond.variable} ${script.variable} ${jakarta.variable}`}>
      <PreviewSwitcher />
    </div>
  );
}
