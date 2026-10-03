/** Package identity for build and import smoke checks. */
export const PACKAGE_NAME = "@maritime-ai/canonical-spec";

export {
  ContainerNumberNormalizedSchema,
  ContainerNumberSchema,
  ImoNumberNormalizedSchema,
  ImoNumberSchema,
  UnLocodeNormalizedSchema,
  UnLocodeSchema,
  type ContainerNumber,
  type ImoNumber,
  type UnLocode,
} from "./schemas/identifiers.js";

export {
  DeclarationAuditSchema,
  DGDeclarationSchema,
  DGDeclarationWireSchema,
  DgItemSchema,
  EmergencyContactSchema,
  FlashPointSchema,
  ImdgClassDivisionSchema,
  MassQuantitySchema,
  PackageCountSchema,
  PackingGroupSchema,
  PortsSchema,
  VesselInfoSchema,
  type DeclarationAudit,
  type DGDeclaration,
  type DgItem,
  type EmergencyContact,
  type FlashPoint,
  type ImdgClassDivision,
  type MassQuantity,
  type PackageCount,
  type PackingGroup,
  type Ports,
  type VesselInfo,
} from "./schemas/dangerous-goods.js";

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
