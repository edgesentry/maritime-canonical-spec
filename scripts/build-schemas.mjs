#!/usr/bin/env node
/**
 * Compile Zod schemas to JSON Schema Draft 2020-12 under schemas/v1/.
 * Regenerated artifacts are committed; CI fails if they drift.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { DGDeclarationWireSchema } from "../src/schemas/dangerous-goods.ts";
import {
  ContainerNumberNormalizedSchema,
  ImoNumberNormalizedSchema,
  UnLocodeNormalizedSchema,
} from "../src/schemas/identifiers.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "schemas", "v1");

/** @param {Record<string, unknown>} schema */
function assertDraft202012(schema, label) {
  if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    throw new Error(`${label}: missing Draft 2020-12 $schema`);
  }
  if (schema.type !== "object" && schema.type !== "string") {
    throw new Error(`${label}: expected top-level type object|string`);
  }
}

function writeSchema(fileName, schema, title, description) {
  const json = /** @type {Record<string, unknown>} */ (z.toJSONSchema(schema));
  const ordered = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://maritime-ai.org/schemas/v1/${fileName}`,
    title,
    description,
    ...Object.fromEntries(
      Object.entries(json).filter(
        ([key]) => !["$schema", "$id", "title", "description"].includes(key),
      ),
    ),
  };
  assertDraft202012(ordered, fileName);
  writeFileSync(join(outDir, fileName), `${JSON.stringify(ordered, null, 2)}\n`);
  console.log(`wrote schemas/v1/${fileName}`);
}

mkdirSync(outDir, { recursive: true });

const IdentifiersBundleSchema = z.object({
  containerNumber: ContainerNumberNormalizedSchema,
  unLocode: UnLocodeNormalizedSchema,
  imoNumber: ImoNumberNormalizedSchema,
});

writeSchema(
  "identifiers.schema.json",
  IdentifiersBundleSchema,
  "Maritime identifier schemas",
  "Normalized ISO 6346 container numbers, UN/LOCODE, and IMO ship numbers. Check-digit validation is enforced by the Zod runtime schemas, not by this JSON Schema alone.",
);

writeSchema(
  "dg-declaration.schema.json",
  DGDeclarationWireSchema,
  "Dangerous Goods Declaration",
  "IMO IMDG / FAL Form 7 / OpenDGD-aligned canonical DG declaration (normalized wire shape). Identifier check digits are runtime Zod concerns.",
);
