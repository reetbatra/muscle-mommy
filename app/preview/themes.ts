/**
 * Three design directions, expressed as token sets.
 *
 * The same screen renders three times, so what is being compared is the design
 * and nothing else. Every direction drops the pink and lilac gradients and the
 * rounded sans.
 */
export type Theme = {
  id: "a" | "b" | "c";
  name: string;
  blurb: string;
  vars: Record<string, string>;
  /** Handwriting is display-only. Nothing you actually read is set in it. */
  script: boolean;
  paperGrain: boolean;
};

export const THEMES: Theme[] = [
  {
    id: "a",
    name: "Ink & Paper",
    blurb: "EB Garamond throughout. Hairline rules, no cards, one oxblood accent.",
    script: false,
    paperGrain: false,
    vars: {
      "--p-bg": "#faf6ef",
      "--p-surface": "#faf6ef",
      "--p-ink": "#1f1a17",
      "--p-soft": "#6b615a",
      "--p-faint": "#9a8f84",
      "--p-rule": "#e3dacb",
      "--p-accent": "#7b2d3b",
      "--p-good": "#4a6b4f",
      "--p-warn": "#9a6b2f",
      "--p-radius": "0px",
      "--p-shadow": "none",
      "--p-card-border": "0px",
      "--p-track": "#eae1d2",
    },
  },
  {
    id: "b",
    name: "Handwritten Journal",
    blurb: "Handwriting for the name and headings only. Garamond for everything you read.",
    script: true,
    paperGrain: true,
    vars: {
      "--p-bg": "#f6f0e4",
      "--p-surface": "#fffdf7",
      "--p-ink": "#33291f",
      "--p-soft": "#7a6a57",
      "--p-faint": "#a3937c",
      "--p-rule": "#e6dcc8",
      "--p-accent": "#c36a4e",
      "--p-good": "#7a8b6f",
      "--p-warn": "#c08a3e",
      "--p-radius": "6px",
      "--p-shadow": "0 1px 2px rgb(51 41 31 / 0.07), 0 8px 20px -14px rgb(51 41 31 / 0.35)",
      "--p-card-border": "1px",
      "--p-track": "#ece2ce",
    },
  },
  {
    id: "c",
    name: "Quiet Luxe",
    blurb: "Near-black, huge Garamond, one brass accent. Hierarchy from type, not colour.",
    script: false,
    paperGrain: false,
    vars: {
      "--p-bg": "#14110f",
      "--p-surface": "#14110f",
      "--p-ink": "#efe9df",
      "--p-soft": "#9a9086",
      "--p-faint": "#6e665e",
      "--p-rule": "#2e2822",
      "--p-accent": "#c9a464",
      "--p-good": "#a8b98f",
      "--p-warn": "#c9a464",
      "--p-radius": "0px",
      "--p-shadow": "none",
      "--p-card-border": "0px",
      "--p-track": "#2a241e",
    },
  },
];
