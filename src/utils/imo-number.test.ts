import { describe, expect, it } from "vitest";
import { computeImoCheckDigit, isValidImoNumber, normalizeImoNumber } from "./imo-number.js";

const VALID_IMO_NUMBERS = ["9074729", "IMO 9074729", "imo-9074729", "8516201", "1000100"] as const;
const INVALID_IMO_NUMBERS = [
  "9074728", // wrong check digit
  "907472", // too short
  "90747290", // too long
  "ABCDEFG",
  "",
] as const;

describe("normalizeImoNumber", () => {
  it("strips optional IMO prefix and separators", () => {
    expect(normalizeImoNumber("IMO 9074729")).toBe("9074729");
    expect(normalizeImoNumber("imo-9074729")).toBe("9074729");
  });
});

describe("computeImoCheckDigit", () => {
  it("matches known check digits", () => {
    expect(computeImoCheckDigit("907472")).toBe(9);
    expect(computeImoCheckDigit("851620")).toBe(1);
    expect(computeImoCheckDigit("100010")).toBe(0);
  });

  it("rejects malformed bodies", () => {
    expect(() => computeImoCheckDigit("12345")).toThrow(/6 digits/);
  });
});

describe("isValidImoNumber", () => {
  it.each(VALID_IMO_NUMBERS)("accepts valid fixture %s", (value) => {
    expect(isValidImoNumber(value)).toBe(true);
  });

  it.each(INVALID_IMO_NUMBERS)("rejects invalid fixture %s", (value) => {
    expect(isValidImoNumber(value)).toBe(false);
  });
});
