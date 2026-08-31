/**
 * The chosen direction, assembled from what worked in each of the three.
 *
 * Type and scale from Quiet Luxe, paper and grid from Handwritten Journal but
 * lightened to near-white, macro bars from Ink & Paper. The brass had to be
 * darkened to a bronze: #c9a464 on a light ground is 1.9:1, which fails, and
 * #8a6b33 clears 4.5:1.
 */
export type Theme = {
  id: string;
  name: string;
  vars: Record<string, string>;
  paperGrain: boolean;
};

export const THEME: Theme = {
  id: "paper-luxe",
  name: "Paper",
  paperGrain: true,
  vars: {
    "--p-bg": "#fbf9f4",
    "--p-surface": "#fbf9f4",
    "--p-ink": "#1a1713",
    "--p-soft": "#6e655b",
    "--p-faint": "#9c9184",
    "--p-rule": "#e5ded2",
    "--p-accent": "#8a6b33",
    "--p-good": "#4f6b45",
    "--p-track": "#eae3d6",
  },
};
