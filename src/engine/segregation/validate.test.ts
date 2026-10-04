import { describe, expect, it } from "vitest";
import type { DgItem } from "../../schemas/dangerous-goods.js";
import { lookupSegregationByClass, validateSegregation } from "./index.js";

function item(overrides: Partial<DgItem> & Pick<DgItem, "unNumber" | "classDivision">): DgItem {
  return {
    properShippingName: "TEST SUBSTANCE",
    packingGroup: "II",
    marinePollutant: false,
    quantity: { grossMass: { value: 1000, unit: "KGM" } },
    packageCount: { count: 1, packagingTypeCode: "4G" },
    containerNumber: "MSKU1234565",
    emergencyContact: { name: "DG Desk", phone: "+81-3-0000-0000" },
    ...overrides,
  };
}

describe("lookupSegregationByClass", () => {
  it("returns 4 for Class 1.1 vs 5.1", () => {
    expect(lookupSegregationByClass("1.1", "5.1")).toBe("4");
  });

  it("returns 2 for Class 2.1 vs 3", () => {
    expect(lookupSegregationByClass("2.1", "3")).toBe("2");
  });

  it("returns X for Class 3 vs 8", () => {
    expect(lookupSegregationByClass("3", "8")).toBe("X");
  });

  it("returns 3 for Class 6.2 vs 3", () => {
    expect(lookupSegregationByClass("6.2", "3")).toBe("3");
  });
});

describe("validateSegregation", () => {
  it("A: Class 1.1 + 5.1 same CTU → CRITICAL_VIOLATION", () => {
    const report = validateSegregation([
      item({ unNumber: "0004", classDivision: "1.1", properShippingName: "AMMONIUM PICRATE" }),
      item({
        unNumber: "1479",
        classDivision: "5.1",
        properShippingName: "OXIDIZING SOLID, N.O.S.",
      }),
    ]);
    expect(report.status).toBe("CRITICAL_VIOLATION");
    expect(report.conflicts[0]?.violated).toBe(true);
    expect(report.conflicts[0]?.requiredSegregation).toBe("4");
    expect(report.conflicts[0]?.properShippingNames[0]).toBe("AMMONIUM PICRATE");
    expect(report.citations).toEqual(
      expect.arrayContaining([
        "IMDG Code 7.2.4 Table 7.2.4",
        "IMDG Code 7.2.3.2",
        "危規則第21条",
        "危規則第33条",
      ]),
    );
  });

  it("B: Class 2.1 + 3 same CTU → CRITICAL_VIOLATION", () => {
    const report = validateSegregation([
      item({ unNumber: "1001", classDivision: "2.1" }),
      item({ unNumber: "1993", classDivision: "3" }),
    ]);
    expect(report.status).toBe("CRITICAL_VIOLATION");
    expect(report.conflicts[0]?.requiredSegregation).toBe("2");
  });

  it("C: Class 1.1 + 5.1 different CTUs → PASS", () => {
    const report = validateSegregation([
      item({ unNumber: "0004", classDivision: "1.1", containerNumber: "MSKU1234565" }),
      item({ unNumber: "1479", classDivision: "5.1", containerNumber: "TEMU7654321" }),
    ]);
    expect(report.status).toBe("PASS");
    expect(report.conflicts).toHaveLength(0);
    expect(report.citations).toHaveLength(0);
  });

  it("D: Class 3 + 8 same CTU → WARNING (X)", () => {
    const report = validateSegregation([
      item({ unNumber: "1993", classDivision: "3" }),
      item({ unNumber: "1789", classDivision: "8" }),
    ]);
    expect(report.status).toBe("WARNING");
    expect(report.conflicts.some((c) => c.requiredSegregation === "X" && !c.violated)).toBe(true);
  });

  it("E: Class 3 with low flashpoint → WARNING", () => {
    const report = validateSegregation([
      item({
        unNumber: "1090",
        classDivision: "3",
        flashPoint: { value: 12, unit: "CEL" },
      }),
    ]);
    expect(report.status).toBe("WARNING");
    expect(report.conflicts.some((c) => c.requiredSegregation === "FP")).toBe(true);
    expect(report.citations).toContain("IMDG Class 3 flashpoint caution");
  });

  it("F: subsidiary 5.1 vs Class 3 escalates to CRITICAL", () => {
    const report = validateSegregation([
      item({
        unNumber: "2014",
        classDivision: "8",
        subsidiaryRisks: ["5.1"],
      }),
      item({ unNumber: "1993", classDivision: "3" }),
    ]);
    expect(report.status).toBe("CRITICAL_VIOLATION");
    expect(report.conflicts.some((c) => c.requiredSegregation === "2" && c.violated)).toBe(true);
  });

  it("G: single Class 3 at flashpoint 23 alone → PASS", () => {
    const report = validateSegregation([
      item({
        unNumber: "1993",
        classDivision: "3",
        flashPoint: { value: 23, unit: "CEL" },
      }),
    ]);
    expect(report.status).toBe("PASS");
    expect(report.conflicts).toHaveLength(0);
  });

  it("japanKikisonOverlay false omits 危規則 citations", () => {
    const report = validateSegregation(
      [
        item({ unNumber: "0004", classDivision: "1.1" }),
        item({ unNumber: "1479", classDivision: "5.1" }),
      ],
      { japanKikisonOverlay: false },
    );
    expect(report.status).toBe("CRITICAL_VIOLATION");
    expect(report.citations).toContain("IMDG Code 7.2.4 Table 7.2.4");
    expect(report.citations).not.toContain("危規則第21条");
    expect(report.citations).not.toContain("危規則第33条");
  });
});
