import { describe, expect, it } from "vitest";
import { parseHealthNumber } from "../numbers";

describe("parseHealthNumber", () => {
  it("takes a plain number through unchanged", () => {
    expect(parseHealthNumber(8421)).toBe(8421);
    expect(parseHealthNumber(61.2)).toBe(61.2);
  });

  it("reads a plain numeric string", () => {
    expect(parseHealthNumber("8421")).toBe(8421);
    expect(parseHealthNumber("61.2")).toBe(61.2);
  });

  it("strips the units Shortcuts appends", () => {
    expect(parseHealthNumber("8421 steps")).toBe(8421);
    expect(parseHealthNumber("61.2 kg")).toBe(61.2);
    expect(parseHealthNumber("412 kcal")).toBe(412);
    expect(parseHealthNumber("58 BPM")).toBe(58);
  });

  it("treats a comma before three digits as a thousands separator", () => {
    expect(parseHealthNumber("8,421")).toBe(8421);
    expect(parseHealthNumber("12,345 steps")).toBe(12345);
  });

  it("treats a comma before one or two digits as a decimal point", () => {
    // The one that matters: 612kg body weight would be nonsense.
    expect(parseHealthNumber("61,2")).toBe(61.2);
    expect(parseHealthNumber("61,25 kg")).toBe(61.25);
  });

  it("handles both separators together, either way round", () => {
    expect(parseHealthNumber("1,234.5")).toBe(1234.5);
    expect(parseHealthNumber("1.234,5")).toBe(1234.5);
  });

  it("handles the narrow and non-breaking spaces used as separators", () => {
    expect(parseHealthNumber("8 421")).toBe(8421);
    expect(parseHealthNumber("8 421")).toBe(8421);
  });

  it("returns null rather than a wrong number for junk", () => {
    expect(parseHealthNumber("")).toBeNull();
    expect(parseHealthNumber("   ")).toBeNull();
    expect(parseHealthNumber("no data")).toBeNull();
    expect(parseHealthNumber("-")).toBeNull();
    expect(parseHealthNumber(null)).toBeNull();
    expect(parseHealthNumber(undefined)).toBeNull();
    expect(parseHealthNumber(Number.NaN)).toBeNull();
  });

  it("keeps a negative number negative", () => {
    expect(parseHealthNumber("-3.5")).toBe(-3.5);
  });
});
