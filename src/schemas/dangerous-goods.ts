import { z } from "zod";
import {
  ContainerNumberNormalizedSchema,
  ContainerNumberSchema,
  ImoNumberNormalizedSchema,
  ImoNumberSchema,
  UnLocodeNormalizedSchema,
  UnLocodeSchema,
} from "./identifiers.js";

/** IMDG primary class / division (e.g. "3", "4.1", "5.2", "8"). */
export const ImdgClassDivisionSchema = z
  .string()
  .regex(
    /^(?:[1-9]|1\.[1-6]|2\.[1-3]|4\.[1-3]|5\.[12]|6\.[12])$/,
    "classDivision must be a valid IMDG class or division code",
  );

export const PackingGroupSchema = z.enum(["I", "II", "III"]).nullable();

export const MassQuantitySchema = z.object({
  value: z.number().nonnegative(),
  unit: z.enum(["KGM", "TNE", "GRM"]),
});

export const FlashPointSchema = z.object({
  value: z.number(),
  unit: z.literal("CEL"),
});

export const PackageCountSchema = z.object({
  count: z.number().int().positive(),
  /** UN packaging code, e.g. "4G" fibreboard box. */
  packagingTypeCode: z.string().min(1).max(16),
});

export const EmergencyContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(3),
});

type IdentifierBundle = {
  containerNumber: z.ZodType<string>;
  imoNumber: z.ZodType<string>;
  unLocode: z.ZodType<string>;
};

function createDgItemSchema(ids: IdentifierBundle) {
  return z.object({
    unNumber: z.string().regex(/^\d{4}$/, "unNumber must be a 4-digit UN number string"),
    properShippingName: z.string().min(1),
    classDivision: ImdgClassDivisionSchema,
    subsidiaryRisks: z.array(ImdgClassDivisionSchema).optional(),
    packingGroup: PackingGroupSchema,
    flashPoint: FlashPointSchema.optional(),
    marinePollutant: z.boolean(),
    segregationGroups: z.array(z.string().min(1)).optional(),
    quantity: z.object({
      grossMass: MassQuantitySchema,
      netMass: MassQuantitySchema.optional(),
      netExplosiveMass: MassQuantitySchema.optional(),
    }),
    packageCount: PackageCountSchema,
    containerNumber: ids.containerNumber,
    emergencyContact: EmergencyContactSchema,
  });
}

function createVesselInfoSchema(ids: IdentifierBundle) {
  return z.object({
    name: z.string().min(1),
    imoNumber: ids.imoNumber,
    voyageNumber: z.string().min(1),
    callSign: z.string().min(1),
  });
}

function createPortsSchema(ids: IdentifierBundle) {
  return z.object({
    pol: ids.unLocode,
    pod: ids.unLocode,
    etd: z.iso.datetime().optional(),
    eta: z.iso.datetime().optional(),
  });
}

export const DeclarationAuditSchema = z.object({
  sourceDocumentSha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/i, "sourceDocumentSha256 must be a SHA-256 hex digest"),
  timestamp: z.iso.datetime(),
  status: z.enum(["draft", "submitted", "accepted", "rejected"]),
});

/** White paper / red paper / last-minute amendment hint from extraction. */
export const DocumentKindSchema = z.enum(["white_paper", "red_paper", "amendment"]);

/** Operational DG document lifecycle (distinct from audit.status completeness). */
export const LifecycleStatusSchema = z.enum(["PRE_ARRIVAL", "SUBMITTED", "AMENDED"]);

export const FieldDeltaSchema = z.object({
  path: z.string().min(1),
  from: z.unknown().optional(),
  to: z.unknown().optional(),
});

export const DeclarationLifecycleSchema = z.object({
  status: LifecycleStatusSchema,
  revision: z.number().int().positive(),
  caseId: z.uuid(),
  previousDeclarationId: z.uuid().optional(),
  delta: z.array(FieldDeltaSchema).optional(),
});

function createDGDeclarationSchema(ids: IdentifierBundle) {
  return z.object({
    declarationId: z.uuid(),
    bookingNumber: z.string().min(1).optional(),
    carrierName: z.string().min(1).optional(),
    documentKind: DocumentKindSchema.optional(),
    vesselInfo: createVesselInfoSchema(ids),
    ports: createPortsSchema(ids),
    items: z.array(createDgItemSchema(ids)).min(1),
    audit: DeclarationAuditSchema,
    lifecycle: DeclarationLifecycleSchema.optional(),
  });
}

const runtimeIds: IdentifierBundle = {
  containerNumber: ContainerNumberSchema,
  imoNumber: ImoNumberSchema,
  unLocode: UnLocodeSchema,
};

const wireIds: IdentifierBundle = {
  containerNumber: ContainerNumberNormalizedSchema,
  imoNumber: ImoNumberNormalizedSchema,
  unLocode: UnLocodeNormalizedSchema,
};

/**
 * Canonical Dangerous Goods Declaration (IMO IMDG / FAL Form 7 / OpenDGD-aligned).
 * Accepts loosely formatted identifiers and normalizes them.
 */
export const DGDeclarationSchema = createDGDeclarationSchema(runtimeIds);

/**
 * Structural wire schema for JSON Schema export (normalized identifier patterns).
 * Check-digit rules remain runtime-only via {@link DGDeclarationSchema}.
 */
export const DGDeclarationWireSchema = createDGDeclarationSchema(wireIds);

export const DgItemSchema = createDgItemSchema(runtimeIds);
export const VesselInfoSchema = createVesselInfoSchema(runtimeIds);
export const PortsSchema = createPortsSchema(runtimeIds);

export type ImdgClassDivision = z.infer<typeof ImdgClassDivisionSchema>;
export type PackingGroup = z.infer<typeof PackingGroupSchema>;
export type MassQuantity = z.infer<typeof MassQuantitySchema>;
export type FlashPoint = z.infer<typeof FlashPointSchema>;
export type PackageCount = z.infer<typeof PackageCountSchema>;
export type EmergencyContact = z.infer<typeof EmergencyContactSchema>;
export type DgItem = z.infer<typeof DgItemSchema>;
export type VesselInfo = z.infer<typeof VesselInfoSchema>;
export type Ports = z.infer<typeof PortsSchema>;
export type DeclarationAudit = z.infer<typeof DeclarationAuditSchema>;
export type DocumentKind = z.infer<typeof DocumentKindSchema>;
export type LifecycleStatus = z.infer<typeof LifecycleStatusSchema>;
export type FieldDelta = z.infer<typeof FieldDeltaSchema>;
export type DeclarationLifecycle = z.infer<typeof DeclarationLifecycleSchema>;
export type DGDeclaration = z.infer<typeof DGDeclarationSchema>;
