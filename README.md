# @maritime-ai/canonical-spec

International standards-compliant **canonical data model** for maritime shipping, port logistics, and marine insurance.

This package defines a neutral intermediate specification aligned with global standards (IMO, DCSA, UN/CEFACT, ISO). Country- or platform-specific EDI mappings are kept outside the core model.

## Install

```bash
pnpm add @maritime-ai/canonical-spec
```

Also works with npm and yarn:

```bash
npm install @maritime-ai/canonical-spec
```

## Identifier validation

Validate and normalize ISO 6346 container numbers, UN/LOCODE ports, and IMO ship numbers:

```ts
import {
  ContainerNumberSchema,
  ImoNumberSchema,
  UnLocodeSchema,
  isValidIso6346ContainerNumber,
} from "@maritime-ai/canonical-spec";

ContainerNumberSchema.parse("msku 123456-5"); // "MSKU1234565"
UnLocodeSchema.parse("jp tyo"); // "JPTYO"
ImoNumberSchema.parse("IMO 9074729"); // "9074729"

isValidIso6346ContainerNumber("MSKU1234567"); // false (bad check digit)
```

Standalone helpers (`computeIso6346CheckDigit`, `computeImoCheckDigit`, …) are also exported for use without Zod.

## Dangerous goods declaration

Parse an IMO IMDG / FAL Form 7–aligned declaration (OpenDGD-compatible field set):

```ts
import { DGDeclarationSchema } from "@maritime-ai/canonical-spec";

const declaration = DGDeclarationSchema.parse({
  declarationId: "550e8400-e29b-41d4-a716-446655440000",
  vesselInfo: {
    name: "ONE INNOVATION",
    imoNumber: "IMO 9074729",
    voyageNumber: "012E",
    callSign: "3EWA5",
  },
  ports: { pol: "JPTYO", pod: "SGSIN" },
  items: [
    {
      unNumber: "1993",
      properShippingName: "FLAMMABLE LIQUID, N.O.S.",
      classDivision: "3",
      packingGroup: "II",
      marinePollutant: false,
      quantity: { grossMass: { value: 15000, unit: "KGM" } },
      packageCount: { count: 20, packagingTypeCode: "4G" },
      containerNumber: "MSKU1234565",
      emergencyContact: { name: "DG Desk 24h", phone: "+81-3-1234-5678" },
    },
  ],
  audit: {
    sourceDocumentSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    timestamp: "2026-03-28T02:15:00.000Z",
    status: "submitted",
  },
});
```

Synthetic red/white form fixtures live under [`examples/v1/`](./examples/v1/).

## IMDG segregation validation

Deterministic co-loading checks against IMDG Code Table 7.2.4 (optional Japanese 危規則 citation overlay):

```ts
import { validateSegregation } from "@maritime-ai/canonical-spec";

const report = validateSegregation(declaration.items);
// report.status: "PASS" | "WARNING" | "CRITICAL_VIOLATION"
```

Normative docs:

- English: [`docs/engine/segregation.en.md`](./docs/engine/segregation.en.md)
- Japanese: [`docs/engine/segregation.ja.md`](./docs/engine/segregation.ja.md)

## JSON Schema artifacts

Language-agnostic Draft 2020-12 schemas are generated from Zod and committed under [`schemas/v1/`](./schemas/v1/):

```bash
pnpm build:schemas
```

CI regenerates these files and fails on drift (`git diff --exit-code -- schemas/`). Keep the generated JSON committed.

JSON Schema covers structural constraints (patterns, required fields, enums). ISO 6346 / IMO check-digit validation remains a **runtime Zod** concern and is not fully expressible in JSON Schema alone.

## Development

Requires Node.js 22+ and [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm check   # typecheck + lint + test + build:schemas + build
```

Individual scripts: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build:schemas`, `pnpm build`.

`pnpm build` emits dual ESM (`.mjs`) / CJS (`.cjs`) bundles and TypeScript declarations under `dist/`. Published packages also include `schemas/`.

## Standards references

| Body | Focus |
| --- | --- |
| [IMO](https://www.imo.org/) | IMDG Code, FAL Compendium (electronic declarations) |
| [DCSA](https://dcsa.org/) | Container shipping interface standards (eBL, booking, track & trace) |
| [UN/CEFACT](https://unece.org/trade/uncefact) | Multi-Modal Transport Reference Data Model, UN/EDIFACT |
| [ISO](https://www.iso.org/) | ISO 6346 (container ID), ISO 668 (size/type), UN/LOCODE |

## License

[Apache-2.0](./LICENSE)
