import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DGDeclarationSchema, ImdgClassDivisionSchema } from "./dangerous-goods.js";

const examplesDir = join(dirname(fileURLToPath(import.meta.url)), "../../examples/v1");

function loadExample(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(examplesDir, name), "utf8")) as Record<string, unknown>;
}

function withMutatedItem(
  fixture: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const items = fixture.items;
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    typeof items[0] !== "object" ||
    items[0] === null
  ) {
    throw new Error("fixture.items[0] missing");
  }
  return {
    ...fixture,
    items: [{ ...(items[0] as Record<string, unknown>), ...patch }, ...items.slice(1)],
  };
}

describe("DGDeclarationSchema", () => {
  it("accepts the red-form (DGD) synthetic fixture", () => {
    const result = DGDeclarationSchema.safeParse(loadExample("dg-declaration-red.json"));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vesselInfo.imoNumber).toBe("9074729");
      expect(result.data.items[0]?.containerNumber).toBe("MSKU1234565");
      expect(result.data.ports.pol).toBe("JPTYO");
    }
  });

  it("accepts the white-form (pre-advice) synthetic fixture", () => {
    const result = DGDeclarationSchema.safeParse(loadExample("dg-declaration-white.json"));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ports.pol).toBe("JPTYO");
      expect(result.data.ports.pod).toBe("SGSIN");
      expect(result.data.items[0]?.marinePollutant).toBe(true);
      expect(result.data.items[0]?.containerNumber).toBe("MSKU1234565");
    }
  });

  it("rejects an invalid UN number", () => {
    const fixture = withMutatedItem(loadExample("dg-declaration-red.json"), { unNumber: "199" });
    expect(DGDeclarationSchema.safeParse(fixture).success).toBe(false);
  });

  it("rejects an invalid IMDG class division", () => {
    const fixture = withMutatedItem(loadExample("dg-declaration-red.json"), {
      classDivision: "10",
    });
    expect(DGDeclarationSchema.safeParse(fixture).success).toBe(false);
  });

  it("accepts class division 6.2", () => {
    expect(ImdgClassDivisionSchema.safeParse("6.2").success).toBe(true);
    const fixture = withMutatedItem(loadExample("dg-declaration-red.json"), {
      classDivision: "6.2",
    });
    expect(DGDeclarationSchema.safeParse(fixture).success).toBe(true);
  });

  it("rejects a corrupt container check digit", () => {
    const fixture = withMutatedItem(loadExample("dg-declaration-red.json"), {
      containerNumber: "MSKU1234567",
    });
    expect(DGDeclarationSchema.safeParse(fixture).success).toBe(false);
  });

  it("rejects a corrupt IMO number", () => {
    const fixture = loadExample("dg-declaration-red.json");
    const vesselInfo = fixture.vesselInfo;
    if (typeof vesselInfo !== "object" || vesselInfo === null) {
      throw new Error("fixture.vesselInfo missing");
    }
    expect(
      DGDeclarationSchema.safeParse({
        ...fixture,
        vesselInfo: { ...vesselInfo, imoNumber: "9074728" },
      }).success,
    ).toBe(false);
  });
});
