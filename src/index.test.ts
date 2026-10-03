import { describe, expect, it } from "vitest";
import { PACKAGE_NAME } from "./index.js";

describe("PACKAGE_NAME", () => {
  it("identifies the published package", () => {
    expect(PACKAGE_NAME).toBe("@maritime-ai/canonical-spec");
  });
});
