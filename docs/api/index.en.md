# API Reference

TypeScript API reference for the public surface of `@maritime-ai/canonical-spec` (EdgeSentry `maritime-canonical-spec`).

Generated from [`src/index.ts`](https://github.com/edgesentry/maritime-canonical-spec/blob/main/src/index.ts) with TypeDoc. Narrative engine docs (for example segregation rules) live under [Engine](../engine/segregation.md); this section documents exported schemas, helpers, and types.

## Browse generated docs

- [Full export index](reference/index.md) — all public type aliases, variables, and functions

## Identifiers

ISO 6346 container numbers, UN/LOCODE ports, and IMO ship numbers:

- [`ContainerNumberSchema`](reference/variables/ContainerNumberSchema.md) / [`ContainerNumber`](reference/type-aliases/ContainerNumber.md)
- [`UnLocodeSchema`](reference/variables/UnLocodeSchema.md) / [`UnLocode`](reference/type-aliases/UnLocode.md)
- [`ImoNumberSchema`](reference/variables/ImoNumberSchema.md) / [`ImoNumber`](reference/type-aliases/ImoNumber.md)
- Check-digit helpers: [`computeIso6346CheckDigit`](reference/functions/computeIso6346CheckDigit.md), [`computeImoCheckDigit`](reference/functions/computeImoCheckDigit.md)

## Dangerous goods declaration

IMO IMDG / FAL Form 7–aligned declaration schemas:

- [`DGDeclarationSchema`](reference/variables/DGDeclarationSchema.md) / [`DGDeclaration`](reference/type-aliases/DGDeclaration.md)
- Item / vessel / ports: [`DgItemSchema`](reference/variables/DgItemSchema.md), [`VesselInfoSchema`](reference/variables/VesselInfoSchema.md), [`PortsSchema`](reference/variables/PortsSchema.md)

## Segregation engine

Deterministic co-loading checks against IMDG Code Table 7.2.4:

- [`validateSegregation`](reference/functions/validateSegregation.md)
- Report / options: [`SegregationValidationReport`](reference/type-aliases/SegregationValidationReport.md), [`SegregationOptions`](reference/type-aliases/SegregationOptions.md)
- Lookup helpers: [`lookupSegregation`](reference/functions/lookupSegregation.md), [`lookupSegregationByClass`](reference/functions/lookupSegregationByClass.md)

Normative prose: [Segregation engine](../engine/segregation.md).
