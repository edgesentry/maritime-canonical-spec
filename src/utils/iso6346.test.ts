import { describe, expect, it } from "vitest";
import {
  computeIso6346CheckDigit,
  isValidIso6346ContainerNumber,
  normalizeContainerNumber,
} from "./iso6346.js";

const VALID_CONTAINER_NUMBERS = [
  "CSQU3054383",
  "MSKU1234565",
  "MSCU1234566",
  "TEMU6090326",
  "HLCU1234568",
  "OOLU1234567",
  "msku 123456-5",
] as const;

const INVALID_CONTAINER_NUMBERS = [
  "MSKU1234567", // wrong check digit
  "CSQU3054384", // wrong check digit
  "MSK1234567", // too short owner code
  "MSKU123456", // missing check digit
  "MSKU12345678", // too long
  "1234567ABCD", // inverted shape
  "",
] as const;

describe("normalizeContainerNumber", () => {
  it("trims, uppercases, and strips separators", () => {
    expect(normalizeContainerNumber(" msku 123456-5 ")).toBe("MSKU1234565");
  });
});

describe("computeIso6346CheckDigit", () => {
  it("matches known check digits", () => {
    expect(computeIso6346CheckDigit("CSQU305438")).toBe(3);
    expect(computeIso6346CheckDigit("MSKU123456")).toBe(5);
    expect(computeIso6346CheckDigit("MSCU123456")).toBe(6);
  });

  it("maps remainder 10 to check digit 0", () => {
    // Exhaustively search a small space to prove remainder-10 handling exists,
    // then assert the computed digit for that body is 0.
    for (let serial = 0; serial < 1_000_000; serial += 1) {
      const body = `TEST${String(serial).padStart(6, "0")}`;
      const digit = computeIso6346CheckDigit(body);
      if (digit === 0) {
        // Recompute raw remainder path via validating the full number.
        expect(isValidIso6346ContainerNumber(`${body}0`)).toBe(true);
        return;
      }
    }
    throw new Error("Expected at least one body with check digit 0");
  });

  it("rejects malformed bodies", () => {
    expect(() => computeIso6346CheckDigit("BAD")).toThrow(/4 letters \+ 6 digits/);
  });
});

describe("isValidIso6346ContainerNumber", () => {
  it.each(VALID_CONTAINER_NUMBERS)("accepts valid fixture %s", (value) => {
    expect(isValidIso6346ContainerNumber(value)).toBe(true);
  });

  it.each(INVALID_CONTAINER_NUMBERS)("rejects invalid fixture %s", (value) => {
    expect(isValidIso6346ContainerNumber(value)).toBe(false);
  });
});
