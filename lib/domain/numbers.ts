/**
 * Parsing the numbers Apple Shortcuts sends.
 *
 * Shortcuts interpolates health values as text, and what that text looks like
 * depends on the action and the phone's locale. "8,421", "8 421 steps",
 * "61.2 kg" and "61,2" are all things that turn up. Getting this wrong is not
 * a cosmetic problem: reading "61,2" as 612 would put a 612kg body weight into
 * the chart, and a rejected payload fails invisibly from the phone.
 */
export function parseHealthNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  // Strip units, ordinary spaces, and the narrow and non-breaking spaces some
  // locales use as a thousands separator.
  const stripped = value.replace(/[  \s]/g, "").replace(/[^0-9.,\-]/g, "");
  if (stripped === "") return null;

  const lastComma = stripped.lastIndexOf(",");
  const lastDot = stripped.lastIndexOf(".");
  let normalised: string;

  if (lastComma > lastDot) {
    // A comma trailed by one or two digits is a decimal comma. Trailed by
    // three, it is separating thousands.
    const trailing = stripped.length - lastComma - 1;
    normalised =
      trailing >= 1 && trailing <= 2
        ? stripped.replace(/\./g, "").replace(",", ".")
        : stripped.replace(/,/g, "");
  } else {
    normalised = stripped.replace(/,/g, "");
  }

  if (!/\d/.test(normalised)) return null;
  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : null;
}
