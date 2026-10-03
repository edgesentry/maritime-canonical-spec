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

## Development

Requires Node.js 22+ and [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`pnpm build` emits dual ESM (`.mjs`) / CJS (`.cjs`) bundles and TypeScript declarations under `dist/`.

## Standards references

| Body | Focus |
| --- | --- |
| [IMO](https://www.imo.org/) | IMDG Code, FAL Compendium (electronic declarations) |
| [DCSA](https://dcsa.org/) | Container shipping interface standards (eBL, booking, track & trace) |
| [UN/CEFACT](https://unece.org/trade/uncefact) | Multi-Modal Transport Reference Data Model, UN/EDIFACT |
| [ISO](https://www.iso.org/) | ISO 6346 (container ID), ISO 668 (size/type), UN/LOCODE |

## License

[Apache-2.0](./LICENSE)
