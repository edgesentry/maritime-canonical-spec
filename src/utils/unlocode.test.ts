import { describe, expect, it } from "vitest";
import { isValidUnLocode, normalizeUnLocode } from "./unlocode.js";

const VALID_UNLOCODES = ["JPTYO", "SGSIN", "USNYC", "NLRTM", "jp tyo", "SG-SIN"] as const;
const INVALID_UNLOCODES = ["JPT", "JPTYOO", "1PTYO", "JP TY", "", "JP_TY"] as const;

describe("normalizeUnLocode", () => {
  it("trims, uppercases, and strips separators", () => {
    expect(normalizeUnLocode(" jp tyo ")).toBe("JPTYO");
    expect(normalizeUnLocode("sg-sin")).toBe("SGSIN");
  });
});

describe("isValidUnLocode", () => {
  it.each(VALID_UNLOCODES)("accepts valid fixture %s", (value) => {
    expect(isValidUnLocode(value)).toBe(true);
  });

  it.each(INVALID_UNLOCODES)("rejects invalid fixture %s", (value) => {
    expect(isValidUnLocode(value)).toBe(false);
  });
});
