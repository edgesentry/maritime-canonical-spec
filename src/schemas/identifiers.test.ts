import { describe, expect, it } from "vitest";
import { ContainerNumberSchema, ImoNumberSchema, UnLocodeSchema } from "./identifiers.js";

describe("ContainerNumberSchema", () => {
  it("normalizes and accepts a valid container number", () => {
    const result = ContainerNumberSchema.safeParse(" msku 123456-5 ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("MSKU1234565");
    }
  });

  it("rejects a wrong check digit", () => {
    const result = ContainerNumberSchema.safeParse("MSKU1234567");
    expect(result.success).toBe(false);
  });
});

describe("UnLocodeSchema", () => {
  it("normalizes spaced UN/LOCODE input", () => {
    const result = UnLocodeSchema.safeParse("jp tyo");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("JPTYO");
    }
  });

  it("rejects malformed codes", () => {
    expect(UnLocodeSchema.safeParse("JPT").success).toBe(false);
  });
});

describe("ImoNumberSchema", () => {
  it("accepts prefixed IMO numbers", () => {
    const result = ImoNumberSchema.safeParse("IMO 9074729");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("9074729");
    }
  });

  it("rejects corrupt check digits", () => {
    expect(ImoNumberSchema.safeParse("9074728").success).toBe(false);
  });
});
