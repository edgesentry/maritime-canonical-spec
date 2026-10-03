/** Package identity for build and import smoke checks. */
export const PACKAGE_NAME = "@maritime-ai/canonical-spec";

export {
  ContainerNumberSchema,
  ImoNumberSchema,
  UnLocodeSchema,
  type ContainerNumber,
  type ImoNumber,
  type UnLocode,
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
