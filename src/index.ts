/** Package identity for build and import smoke checks. */
export const PACKAGE_NAME = "@maritime-ai/canonical-spec";

export {
  hazardsForLookup,
  isClass1Hazard,
  lookupSegregation,
  lookupSegregationByClass,
  pickMostStringent,
  type SegregationCode,
  type SegregationConflict,
  type SegregationOptions,
  type SegregationStatus,
  type SegregationTableKey,
  type SegregationValidationReport,
  segregationTermName,
  toSegregationTableKey,
  validateSegregation,
} from "./engine/segregation/index.js";

export {
  type DeclarationAudit,
  DeclarationAuditSchema,
  type DGDeclaration,
  DGDeclarationSchema,
  DGDeclarationWireSchema,
  type DgItem,
  DgItemSchema,
  type EmergencyContact,
  EmergencyContactSchema,
  type FlashPoint,
  FlashPointSchema,
  type ImdgClassDivision,
  ImdgClassDivisionSchema,
  type MassQuantity,
  MassQuantitySchema,
  type PackageCount,
  PackageCountSchema,
  type PackingGroup,
  PackingGroupSchema,
  type Ports,
  PortsSchema,
  type VesselInfo,
  VesselInfoSchema,
} from "./schemas/dangerous-goods.js";
export {
  type ContainerNumber,
  ContainerNumberNormalizedSchema,
  ContainerNumberSchema,
  type ImoNumber,
  ImoNumberNormalizedSchema,
  ImoNumberSchema,
  type UnLocode,
  UnLocodeNormalizedSchema,
  UnLocodeSchema,
} from "./schemas/identifiers.js";
export {
  computeImoCheckDigit,
  isValidImoNumber,
  normalizeImoNumber,
} from "./utils/imo-number.js";
export {
  computeIso6346CheckDigit,
  isValidIso6346ContainerNumber,
  normalizeContainerNumber,
} from "./utils/iso6346.js";
export { isValidUnLocode, normalizeUnLocode } from "./utils/unlocode.js";
